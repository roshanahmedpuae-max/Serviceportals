"use client";

import { useEffect, useState, useMemo, Fragment, FormEvent, useRef, ChangeEvent, useCallback } from "react";
import { RiMenu5Fill, RiAdvertisementFill, RiDashboardFill, RiCalendarScheduleFill } from "react-icons/ri";
import { BiSolidHomeSmile, BiLogoDailymotion } from "react-icons/bi";
import { FaSignOutAlt, FaUserShield, FaEye, FaRegEye } from "react-icons/fa";
import { FaFileInvoiceDollar, FaFaceGrinStars } from "react-icons/fa6";
import { MdModeEdit, MdDelete, MdInventory2 } from "react-icons/md";
import { BsFillSendFill } from "react-icons/bs";
import { IoMdAddCircle } from "react-icons/io";
import { IoFilter, IoNotifications, IoSettings, IoTicketSharp, IoDocumentText } from "react-icons/io5";
import { AiFillNotification } from "react-icons/ai";
import JobLogs from "@/components/admin/JobLogs";
import * as XLSX from "xlsx";
import toast, { Toaster } from "react-hot-toast";
import { createInterval, usePageVisibility } from "@/lib/polling";
import {
  BusinessUnit,
  DailySchedule,
  EmployeeStatus,
  Ticket,
  TicketStatus,
  WorkOrder,
  Payroll,
  LeaveRequest,
  LeaveType,
  OvertimeRequest,
} from "@/lib/types";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import PayrollForm from "@/components/PayrollForm";
import PayrollList from "@/components/PayrollList";
import AssetsModal from "@/components/AssetsModal";

// Helper function to format leave type for display
const formatLeaveType = (type: LeaveType): string => {
  switch (type) {
    case "Annual":
      return "Annual / Vacation";
    case "SickWithCertificate":
      return "Sick with Certificate";
    case "SickWithoutCertificate":
      return "Sick without Certificate";
    default:
      return type;
  }
};

type AdminAuth = {
  email?: string;
  name?: string;
  businessUnit: BusinessUnit;
  role: "admin" | "employee";
  featureAccess?: string[];
};

type Customer = {
  id: string;
  name: string;
  contact?: string;
};

type CustomerUser = {
  id: string;
  email: string;
  username: string;
  companyName?: string;
};

type ServiceType = {
  id: string;
  name: string;
  description?: string;
};

type Employee = {
  id: string;
  name: string;
  role: string;
  status: EmployeeStatus;
  featureAccess?: string[];
};

const Card = ({
  title,
  children,
  accent,
  action,
  className,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={`group bg-white/80 border border-slate-200/70 rounded-2xl shadow-lg p-5 md:p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${className ?? ""}`}>
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-8 rounded-full ${accent ?? "bg-indigo-500"} shadow-inner transition-all duration-300 group-hover:h-10`}
        />
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const badgeColor = (status: EmployeeStatus) =>
  status === "Available"
    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
    : "bg-amber-100 text-amber-700 ring-amber-200";

const BASE_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "assets", label: "Assets" },
  { id: "setup", label: "Setup" },
  { id: "payroll", label: "Payroll" },
  { id: "assign-work", label: "Schedule Works" },
  { id: "job-logs", label: "Job Logs" },
  { id: "tickets", label: "Tickets" },
  { id: "employee-ratings", label: "Employee Ratings" },
] as const;
type TabId = (typeof BASE_TABS)[number]["id"] | "daily-schedule";

export default function AdminDashboard() {
  const [adminAuth, setAdminAuth] = useState<AdminAuth | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBu, setSelectedBu] = useState<BusinessUnit | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);
  const [showEditPayrollModal, setShowEditPayrollModal] = useState(false);
  const [editPayrollEmployeeId, setEditPayrollEmployeeId] = useState("");
  const [editPayrollPeriod, setEditPayrollPeriod] = useState("");
  const [editPayrollBaseSalary, setEditPayrollBaseSalary] = useState("");
  const [editPayrollAllowances, setEditPayrollAllowances] = useState("");
  const [editPayrollDeductions, setEditPayrollDeductions] = useState("");
  const [editPayrollNotes, setEditPayrollNotes] = useState("");
  const [submittingPayrollEdit, setSubmittingPayrollEdit] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAdvertisementModal, setShowAdvertisementModal] = useState(false);
  const [advertisementType, setAdvertisementType] = useState<"image" | "message">("message");
  const [advertisementImage, setAdvertisementImage] = useState<string>("");
  const [advertisementMessage, setAdvertisementMessage] = useState<string>("");
  const [submittingAdvertisement, setSubmittingAdvertisement] = useState(false);
  const isPageVisible = usePageVisibility();
  const [notificationRecipientType, setNotificationRecipientType] = useState<"employee" | "customer" | "both">("employee");
  const [notificationSelectedEmployeeIds, setNotificationSelectedEmployeeIds] = useState<string[]>([]);
  const [notificationSelectedCustomerIds, setNotificationSelectedCustomerIds] = useState<string[]>([]);
  const [notificationSendToAllEmployees, setNotificationSendToAllEmployees] = useState(false);
  const [notificationSendToAllCustomers, setNotificationSendToAllCustomers] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [submittingNotification, setSubmittingNotification] = useState(false);
  const [notificationEmployeeSearch, setNotificationEmployeeSearch] = useState("");
  const [notificationCustomerSearch, setNotificationCustomerSearch] = useState("");
  const [customerUsers, setCustomerUsers] = useState<CustomerUser[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [dailySchedules, setDailySchedules] = useState<DailySchedule[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [rentalMachines, setRentalMachines] = useState<any[]>([]);
  const [copierModels, setCopierModels] = useState<any[]>([]);
  const [importingCustomers, setImportingCustomers] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState<EmployeeStatus>("Available");
  const [editPassword, setEditPassword] = useState("");
  const [editFeatureAccess, setEditFeatureAccess] = useState<string[]>([]);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerContact, setEditCustomerContact] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showCreateEmployeePassword, setShowCreateEmployeePassword] = useState(false);
  const [showEditEmployeePassword, setShowEditEmployeePassword] = useState(false);
  const [assignCustomerName, setAssignCustomerName] = useState("");
  const [assignCustomerId, setAssignCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<string | null>(null);
  const [editWorkOrderCustomerId, setEditWorkOrderCustomerId] = useState<string>("");
  const [editWorkOrderCustomerName, setEditWorkOrderCustomerName] = useState<string>("");
  const [editWorkOrderServiceTypeId, setEditWorkOrderServiceTypeId] = useState<string>("");
  const [editWorkOrderAssignedEmployeeId, setEditWorkOrderAssignedEmployeeId] = useState<string>("");
  const [editWorkOrderDescription, setEditWorkOrderDescription] = useState<string>("");
  const [editWorkOrderLocationAddress, setEditWorkOrderLocationAddress] = useState<string>("");
  const [editWorkOrderCustomerPhone, setEditWorkOrderCustomerPhone] = useState<string>("");
  const [editWorkOrderDateTime, setEditWorkOrderDateTime] = useState<string>("");
  const [editWorkOrderQuotationReferenceNumber, setEditWorkOrderQuotationReferenceNumber] = useState<string>("");
  const [editWorkOrderPaymentMethod, setEditWorkOrderPaymentMethod] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [scheduleEmployeeIds, setScheduleEmployeeIds] = useState<string[]>([]);
  const [scheduleEmployeeNames, setScheduleEmployeeNames] = useState<string[]>([]);
  const [scheduleEmployeeNamesInput, setScheduleEmployeeNamesInput] = useState<string>("");
  const [scheduleTasksText, setScheduleTasksText] = useState<string>("");
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [showAdminProfile, setShowAdminProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [assetDates, setAssetDates] = useState<
    {
      id: string;
      categoryKey: string;
      assetId: string;
      dateType: string;
      dateValue: string;
      status: string;
      daysUntil: number;
    }[]
  >([]);
  const [assetsSummary, setAssetsSummary] = useState<{
    businessUnit: BusinessUnit;
    categories: Record<
      "vehicles" | "registrations" | "bills_contracts" | "it_equipment",
      { active: number }
    >;
    dates: { upcoming: number; overdue: number };
  } | null>(null);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [activeAssetsCategory, setActiveAssetsCategory] = useState<
    | "vehicles"
    | "registrations"
    | "bills_contracts"
    | "it_equipment"
    | "employee_documents"
    | "rental_machines"
    | null
  >(null);
  const [employeeRatingSummary, setEmployeeRatingSummary] = useState<
    { employeeId: string; employeeName: string; role: string; averageScore: number; count: number }[]
  >([]);
  const [loadingEmployeeRatings, setLoadingEmployeeRatings] = useState(false);

  const availableCount = useMemo(() => 
    employees.filter((e) => e.status === "Available").length,
    [employees]
  );
  const assignedCount = useMemo(() => 
    workOrders.filter((w) => w.status === "Assigned").length,
    [workOrders]
  );
  const openTicketCount = useMemo(() => 
    tickets.filter((t) => t.status !== "Closed").length,
    [tickets]
  );
  const submittedCount = useMemo(() => 
    workOrders.filter((w) => w.status === "Submitted").length,
    [workOrders]
  );
  const [activeDashboardPanel, setActiveDashboardPanel] = useState<
    | "customers"
    | "serviceTypes"
    | "availableStaff"
    | "assignedJobs"
    | "openTickets"
    | "payroll"
    | "rentalMachines"
    | null
  >(null);
  const [assetNotifications, setAssetNotifications] = useState<
    Array<{
      id: string;
      sentAt: string;
      categoryKey: string;
      assetId: string;
      dateType: string;
      dateValue: string;
      isOverdueEscalation?: boolean;
      type?: "asset" | "leave" | "ticket" | "asset_approaching" | "advance_salary" | "work_order";
      employeeId?: string;
      employeeName?: string;
      leaveType?: string;
      endDate?: string;
      customerId?: string;
      customerName?: string;
      subject?: string;
      priority?: string;
      status?: string;
      daysUntil?: number;
      isOverdue?: boolean;
      isApproaching?: boolean;
      amount?: number;
      workDescription?: string;
      locationAddress?: string;
    }>
  >([]);
  const [employeeLeaves, setEmployeeLeaves] = useState<Record<string, LeaveRequest[]>>({});
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [employeeOvertimes, setEmployeeOvertimes] = useState<Record<string, OvertimeRequest[]>>({});
  const [loadingOvertimes, setLoadingOvertimes] = useState(false);
  const [advanceSalaryRequests, setAdvanceSalaryRequests] = useState<Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    amount: number;
    reason: string;
    requestedDate: string;
    status: string;
    approvedByAdminId?: string;
    approvedAt?: string;
    rejectedByAdminId?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    approvalMessage?: string;
  }>>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [leaveDecisionModal, setLeaveDecisionModal] = useState<{
    leave: LeaveRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [leaveDecisionReason, setLeaveDecisionReason] = useState("");
  const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState<LeaveRequest | null>(null);
  const [selectedOvertimeForDetails, setSelectedOvertimeForDetails] = useState<OvertimeRequest | null>(null);
  const [overtimeDecisionModal, setOvertimeDecisionModal] = useState<{
    overtime: OvertimeRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [overtimeDecisionReason, setOvertimeDecisionReason] = useState("");

  const openLeaveDetails = async (leave: LeaveRequest) => {
    setSelectedLeaveForDetails(leave);
    // Mark notification as read when viewing
    try {
      await authedFetch("/api/admin/leave", {
        method: "POST",
        body: JSON.stringify({ id: leave.id, action: "view" }),
      });
      // Refresh notifications
      const notifications = await authedFetch("/api/notifications?limit=50");
      setAssetNotifications(Array.isArray(notifications) ? notifications : []);
    } catch {
      // Ignore errors
    }
  };
  const [approvalDocuments, setApprovalDocuments] = useState<Array<{ fileName: string; fileData: string }>>([]);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const assetNotificationCount = useMemo(() => 
    assetNotifications.filter((n) => n.type !== "leave").length,
    [assetNotifications]
  );
  const leaveNotificationCount = useMemo(() => 
    assetNotifications.filter((n) => n.type === "leave").length,
    [assetNotifications]
  );
  const totalNotificationCount = useMemo(() => 
    assetNotifications.length,
    [assetNotifications]
  );
  const pendingLeaveCount = useMemo(() => {
    return Object.values(employeeLeaves)
      .flat()
      .filter((l) => l.status === "Pending").length;
  }, [employeeLeaves]);
  const expiringAssetCountsByCategory = useMemo(() => {
    const counts: Record<"vehicles" | "registrations" | "bills_contracts" | "it_equipment", number> = {
      vehicles: 0,
      registrations: 0,
      bills_contracts: 0,
      it_equipment: 0,
    };
    assetNotifications.forEach((n) => {
      if (
        n.categoryKey === "vehicles" ||
        n.categoryKey === "registrations" ||
        n.categoryKey === "bills_contracts" ||
        n.categoryKey === "it_equipment"
      ) {
        counts[n.categoryKey] += 1;
      }
    });
    return counts;
  }, [assetNotifications]);
  const tabs: { id: TabId; label: string; icon: JSX.Element }[] = useMemo(() => {
    if (!adminAuth) return [];
    
    const base: { id: TabId; label: string; icon: JSX.Element }[] = [];
    const featureAccess = adminAuth.featureAccess || [];
    const isAdmin = adminAuth.role === "admin";
    
    // Dashboard: always visible if logged in
    base.push({ id: "dashboard", label: "Dashboard", icon: <RiDashboardFill /> });
    
    // Assets: requires "assets" access
    if (isAdmin || featureAccess.includes("assets")) {
      base.push({ id: "assets", label: "Assets", icon: <MdInventory2 /> });
    }
    
    // Setup: requires "setup" access (admin only)
    if (isAdmin || featureAccess.includes("setup")) {
      base.push({ id: "setup", label: "Setup", icon: <IoSettings /> });
    }
    
    // Payroll: requires "payroll" access
    if (isAdmin || featureAccess.includes("payroll")) {
      base.push({ id: "payroll", label: "Payroll", icon: <FaFileInvoiceDollar /> });
    }
    
    // Schedule Works: requires "schedule_works" access
    if (isAdmin || featureAccess.includes("schedule_works")) {
      base.push({ id: "assign-work", label: "Schedule Works", icon: <RiCalendarScheduleFill /> });
    }
    
    // Job Logs: requires "schedule_works" access (to view completed work orders)
    if (isAdmin || featureAccess.includes("schedule_works")) {
      base.push({ id: "job-logs", label: "Job Logs", icon: <IoDocumentText /> });
    }
    
    // Tickets: requires "tickets" access
    if (isAdmin || featureAccess.includes("tickets")) {
      base.push({ id: "tickets", label: "Tickets", icon: <IoTicketSharp /> });
    }

    // Employee Ratings: visible to admins
    if (isAdmin) {
      base.push({ id: "employee-ratings", label: "Employee Ratings", icon: <FaFaceGrinStars /> });
    }
    
    // Daily Schedule: PrintersUAE only and requires "schedule_works" access
    if (adminAuth.businessUnit === "PrintersUAE" && (isAdmin || featureAccess.includes("schedule_works"))) {
      base.push({ id: "daily-schedule", label: "Daily Work Schedules", icon: <BiLogoDailymotion /> });
    }
    
    return base;
  }, [adminAuth]);

  // Reset activeTab to a valid tab if current tab is not accessible
  useEffect(() => {
    if (!adminAuth || tabs.length === 0) return;
    
    // Check if current activeTab is in the available tabs
    const isActiveTabValid = tabs.some(tab => tab.id === activeTab);
    
    // If activeTab is not valid, reset to dashboard (first tab, always available)
    if (!isActiveTabValid) {
      setActiveTab("dashboard");
    }
  }, [adminAuth, tabs, activeTab]);

  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, DailySchedule[]> = {};
    dailySchedules.forEach((s) => {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    });
    Object.keys(grouped).forEach((date) => {
      grouped[date] = grouped[date].sort((a, b) =>
        (a.employeeNames[0] || "").localeCompare(b.employeeNames[0] || "")
      );
    });
    return grouped;
  }, [dailySchedules]);

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      credentials: "include",
    });
    
    // Handle 401 Unauthorized - token expired or invalid
    if (res.status === 401) {
      // Try to refresh the token
      try {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        
        if (refreshRes.ok) {
          // Token refreshed successfully, retry original request
          const retryRes = await fetch(url, {
            ...init,
            headers: {
              "Content-Type": "application/json",
              ...(init?.headers || {}),
            },
            credentials: "include",
          });
          
          if (!retryRes.ok) {
            // Still failed after refresh - session truly expired
            setAdminAuth(null);
            setShowLoginModal(true);
            const body = await retryRes.json().catch(() => ({}));
            throw new Error(body.error || "Session expired. Please log in again.");
          }
          
          return retryRes.json();
        } else {
          // Refresh failed - session expired
          setAdminAuth(null);
          setShowLoginModal(true);
          throw new Error("Session expired. Please log in again.");
        }
      } catch (refreshError) {
        // Refresh attempt failed
        setAdminAuth(null);
        setShowLoginModal(true);
        throw new Error("Session expired. Please log in again.");
      }
    }
    
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errorMessage = body.error || "Request failed";
      const error: any = new Error(errorMessage);
      error.status = res.status;
      if (res.status === 403) {
        error.isForbidden = true;
      }
      throw error;
    }
    return res.json();
  }, []);

  const loadAdvanceSalaryRequests = useCallback(async () => {
    try {
      setLoadingAdvances(true);
      const advances = await authedFetch("/api/admin/advance-salary");
      setAdvanceSalaryRequests(Array.isArray(advances) ? advances : []);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load advance salary requests");
    } finally {
      setLoadingAdvances(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    if (activeTab === "payroll") {
      loadAllLeaves();
      loadAllOvertimes();
      loadAdvanceSalaryRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Restore existing admin/employee session from cookie on first load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user && (data.user.role === "admin" || data.user.role === "employee")) {
          const featureAccess = data.user.featureAccess || [];
          
          // For employees, check if they have any feature access - if not, don't restore admin session
          if (data.user.role === "employee") {
            if (!Array.isArray(featureAccess) || featureAccess.length === 0) {
              // Employee has no feature access - they can still use employee portal,
              // but should not be auto-logged into the admin dashboard
              return;
            }
          }
          
          setAdminAuth({
            email: data.user.email,
            name: data.user.name,
            businessUnit: data.user.businessUnit,
            role: data.user.role,
            featureAccess: featureAccess,
          });
        }
      } catch {
        // silently ignore – user is simply not logged in
      }
    };
    checkSession();
  }, []);

  // Auto-refresh session token when it's older than 12 hours
  useEffect(() => {
    const refreshSession = async () => {
      if (!adminAuth || !isPageVisible) return;

      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!res.ok) {
          setAdminAuth(null);
          setShowLoginModal(true);
          return;
        }

        const data = await res.json();
        if (data?.user) {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData?.user) {
              setAdminAuth({
                email: refreshData.user.email || adminAuth.email,
                name: refreshData.user.name || adminAuth.name,
                businessUnit: refreshData.user.businessUnit || adminAuth.businessUnit,
                role: refreshData.user.role || adminAuth.role,
                featureAccess: refreshData.user.featureAccess || adminAuth.featureAccess,
              });
            }
          } else if (refreshRes.status === 401) {
            setAdminAuth(null);
            setShowLoginModal(true);
          }
        }
      } catch (error) {
        console.warn("[Session refresh] Error:", error);
      }
    };

    return createInterval(refreshSession, 5 * 60 * 1000, { runImmediately: true, enabled: !!adminAuth });
  }, [adminAuth, isPageVisible]);

  const loadAdminData = async () => {
    if (!adminAuth) return;
    setLoading(true);
    try {
      const isAdmin = adminAuth.role === "admin";
      
      // Only call admin-only routes if user is admin, otherwise return empty arrays
      const [c, s, e, w, p] = await Promise.allSettled([
        isAdmin ? authedFetch("/api/customers").catch(() => []) : Promise.resolve([]),
        isAdmin ? authedFetch("/api/service-types").catch(() => []) : Promise.resolve([]),
        // Employees can access these if they have the right feature access
        authedFetch("/api/employees").catch(() => []),
        authedFetch("/api/work-orders").catch(() => []),
        authedFetch("/api/payroll").catch(() => []),
      ]);
      setCustomers(c.status === "fulfilled" ? c.value : []);
      setServiceTypes(s.status === "fulfilled" ? s.value : []);
      setEmployees(e.status === "fulfilled" ? e.value : []);
      setWorkOrders(w.status === "fulfilled" ? w.value : []);
      setPayrolls(p.status === "fulfilled" && Array.isArray(p.value) ? p.value : []);
      if (isAdmin) {
        try {
          const ratings = await authedFetch("/api/ratings/admin");
          setEmployeeRatingSummary(
            ratings && Array.isArray(ratings.employees) ? ratings.employees : []
          );
        } catch {
          setEmployeeRatingSummary([]);
        }
      } else {
        setEmployeeRatingSummary([]);
      }
      try {
        const t = await authedFetch("/api/tickets");
        setTickets(Array.isArray(t) ? t : []);
      } catch (error) {
        // Silently handle 401/403 errors (unauthorized/forbidden) - expected for employees without access
        if ((error as any)?.status !== 401 && (error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
          console.error("Failed to load tickets:", error);
        }
        setTickets([]);
      }
      try {
        const dates = await authedFetch("/api/assets/dates?windowDays=90");
        setAssetDates(Array.isArray(dates) ? dates : []);
      } catch (error) {
        // Silently handle 403 errors (feature access denied) - expected for employees without access
        if ((error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
          console.error("Failed to load asset dates:", error);
        }
        setAssetDates([]);
      }
      try {
        const summary = await authedFetch("/api/assets/summary");
        setAssetsSummary(summary);
      } catch (error) {
        // Silently handle 403 errors (feature access denied) - expected for employees without access
        if ((error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
          console.error("Failed to load assets summary:", error);
        }
        setAssetsSummary(null);
      }
      try {
        const notifications = await authedFetch("/api/notifications?limit=50");
        setAssetNotifications(Array.isArray(notifications) ? notifications : []);
      } catch (error) {
        // Silently handle 403 errors (feature access denied) - expected for employees without access
        if ((error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
          console.error("Failed to load notifications:", error);
        }
        setAssetNotifications([]);
      }
      // Only load customer users if admin (admin-only route)
      if (isAdmin) {
        try {
          const customerUsersData = await authedFetch("/api/admin/customer-users");
          setCustomerUsers(Array.isArray(customerUsersData) ? customerUsersData : []);
        } catch (error) {
          // Silently handle 401/403 errors (unauthorized/forbidden)
          if ((error as any)?.status !== 401 && (error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
            console.error("Failed to load customer users:", error);
          }
          setCustomerUsers([]);
        }
      } else {
        setCustomerUsers([]);
      }
      if (adminAuth?.businessUnit === "PrintersUAE") {
        try {
          const rentalMachinesData = await authedFetch("/api/assets/rental-machines");
          setRentalMachines(Array.isArray(rentalMachinesData) ? rentalMachinesData : []);
        } catch (error) {
          // Silently handle 403 errors (feature access denied) - expected for employees without access
          if ((error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
            console.error("Failed to load rental machines:", error);
          }
          setRentalMachines([]);
        }
        try {
          const copierModelsData = await authedFetch("/api/assets/copier-models");
          setCopierModels(Array.isArray(copierModelsData) ? copierModelsData : []);
        } catch (error) {
          // Silently handle 403 errors (feature access denied) - expected for employees without access
          if ((error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
            console.error("Failed to load copier models:", error);
          }
          setCopierModels([]);
        }
      } else {
        setRentalMachines([]);
        setCopierModels([]);
      }
    } catch (error) {
      // Silently handle 401/403 errors (unauthorized/forbidden) - expected for employees without access
      if ((error as any)?.status !== 401 && (error as any)?.status !== 403 && (error as any)?.isForbidden !== true) {
        toast.error((error as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshAssetsMeta = async () => {
    try {
      const [dates, summary] = await Promise.all([
        authedFetch("/api/assets/dates?windowDays=90").catch(() => []),
        authedFetch("/api/assets/summary").catch(() => null),
        authedFetch("/api/notifications?limit=50").catch(() => []),
      ]);
      const [datesResult, summaryResult, notificationsResult] = dates as any;
      setAssetDates(Array.isArray(datesResult) ? datesResult : []);
      setAssetsSummary(summaryResult ?? null);
      setAssetNotifications(Array.isArray(notificationsResult) ? notificationsResult : []);
    } catch {
      // ignore; individual fetch errors are already handled
    }
  };

  const loadDailySchedules = async (options?: { date?: string; from?: string; to?: string }) => {
    if (!adminAuth || adminAuth.businessUnit !== "PrintersUAE") return;
    setLoadingSchedules(true);
    try {
      const params = new URLSearchParams();
      const hasRange = !!(options?.from || options?.to);
      if (options?.from) params.set("from", options.from);
      if (options?.to) params.set("to", options.to);

      const dateParam = options?.date ?? scheduleDate;
      if (!hasRange && dateParam) {
        params.set("date", dateParam);
      }

      const qs = params.toString();
      const data = await authedFetch(`/api/daily-schedules${qs ? `?${qs}` : ""}`);
      setDailySchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (adminAuth) {
      loadAdminData();
    }
  }, [adminAuth]);

  const filterActive = filterFromDate !== "" || filterToDate !== "";

  useEffect(() => {
    if (adminAuth?.businessUnit === "PrintersUAE" && !filterActive) {
      loadDailySchedules({ date: scheduleDate });
    }
  }, [adminAuth, scheduleDate, filterActive]);

  useEffect(() => {
    if (!showLoginModal) {
      setSelectedBu(null);
    }
  }, [showLoginModal]);

  useEffect(() => {
    if (showLoginModal) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowLoginModal(false);
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [showLoginModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-notification-dropdown]')
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  const handleAdminLogin = async (formData: FormData) => {
    const password = formData.get("password") as string;
    if (!selectedBu) {
      toast.error("Select a business unit first");
      return;
    }
    setLoading(true);
    try {
      // Try admin login first
      const adminRes = await fetch("/api/auth/admin", {
        method: "POST",
        body: JSON.stringify({ password, businessUnit: selectedBu }),
        credentials: "include",
      });
      
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminAuth({
          email: adminData.admin.email,
          businessUnit: adminData.admin.businessUnit,
          role: "admin",
          featureAccess: [], // Admins have full access
        });
        setShowLoginModal(false);
        toast.success("Admin signed in");
        return;
      }

      // If admin login fails, try employee login
      const employeeRes = await fetch("/api/auth/employee", {
        method: "POST",
        body: JSON.stringify({ password, businessUnit: selectedBu }),
        credentials: "include",
      });

      if (employeeRes.ok) {
        const employeeData = await employeeRes.json();
        const featureAccess = employeeData.employee.featureAccess || [];
        
        // Check if employee has any feature access - if not, prevent login
        if (!Array.isArray(featureAccess) || featureAccess.length === 0) {
          toast.error("Access denied: No feature access granted. Please contact administrator.");
          return;
        }
        
        setAdminAuth({
          name: employeeData.employee.name,
          businessUnit: employeeData.employee.businessUnit,
          role: "employee",
          featureAccess: featureAccess,
        });
        setShowLoginModal(false);
        toast.success("Employee signed in");
        return;
      } else {
        // Employee login failed - check if it's a feature access error
        const employeeBody = await employeeRes.json().catch(() => ({}));
        if (employeeRes.status === 403 && employeeBody.error?.includes("feature access")) {
          toast.error(employeeBody.error || "Access denied: No feature access granted. Please contact administrator.");
          return;
        }
      }

      // Both logins failed
      const adminBody = await adminRes.json().catch(() => ({}));
      const employeeBody = await employeeRes.json().catch(() => ({}));
      throw new Error(adminBody.error || employeeBody.error || "Invalid credentials");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(
      () => {}
    );
    setAdminAuth(null);
    setWorkOrders([]);
    setTickets([]);
    setCustomers([]);
    setEmployees([]);
    setServiceTypes([]);
    setDailySchedules([]);
    setPayrolls([]);
    setScheduleEmployeeIds([]);
    setScheduleEmployeeNames([]);
    setScheduleEmployeeNamesInput("");
    setScheduleTasksText("");
  };

  const handleCreateCustomer = useCallback(async (formData: FormData) => {
    try {
      const payload = {
        name: formData.get("name"),
      };
      const created = await authedFetch("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCustomers((prev) => [created, ...prev]);
      toast.success("Customer created");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [authedFetch]);

  const handleImportCustomers = useCallback(async (file: File) => {
    setImportingCustomers(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
      }) as (string | number | undefined)[][];
      const names = rows
        .map((r) => (r?.[0] ?? "").toString().trim())
        .filter((n) => n.length > 0);
      if (names.length === 0) {
        toast.error("No names found in the first column");
        return;
      }
      const res = await authedFetch("/api/customers/import", {
        method: "POST",
        body: JSON.stringify({ names }),
      });
      const createdList = (res.created as Customer[]) ?? [];
      setCustomers((prev) => [...createdList, ...prev]);
      toast.success(`Imported ${createdList.length} customers`);
    } catch (error) {
      toast.error((error as Error).message || "Import failed");
    } finally {
      setImportingCustomers(false);
    }
  }, [authedFetch]);

  const handleCreateServiceType = useCallback(async (formData: FormData) => {
    try {
      const payload = {
        name: formData.get("name"),
      };
      const created = await authedFetch("/api/service-types", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setServiceTypes((prev) => [created, ...prev]);
      toast.success("Service type created");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [authedFetch]);

  const handleCreateEmployee = async (formData: FormData) => {
    try {
      // Collect feature access from checkboxes
      const featureAccess: string[] = [];
      const features = ["payroll", "assets", "tickets", "schedule_works", "dashboard", "setup", "notifications", "advertisements"];
      features.forEach((feature) => {
        if (formData.get(`feature_${feature}`) === "on") {
          featureAccess.push(feature);
        }
      });
      
      const payload = {
        name: formData.get("name"),
        password: formData.get("password"),
        role: formData.get("role"),
        featureAccess,
      };
      const created = await authedFetch("/api/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEmployees((prev) => [created, ...prev]);
      toast.success("Employee created");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const loadAllOvertimes = async () => {
    if (!adminAuth) return;
    setLoadingOvertimes(true);
    try {
      const overtimes = await authedFetch("/api/admin/overtime");
      const grouped: Record<string, OvertimeRequest[]> = {};
      (Array.isArray(overtimes) ? overtimes : []).forEach((o: OvertimeRequest) => {
        if (!grouped[o.employeeId]) {
          grouped[o.employeeId] = [];
        }
        grouped[o.employeeId].push(o);
      });
      setEmployeeOvertimes(grouped);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load overtime requests");
      setEmployeeOvertimes({});
    } finally {
      setLoadingOvertimes(false);
    }
  };

  const loadAllLeaves = async () => {
    try {
      setLoadingLeaves(true);
      const leaves: LeaveRequest[] = await authedFetch("/api/admin/leave");
      const byEmployee: Record<string, LeaveRequest[]> = {};
      (Array.isArray(leaves) ? leaves : []).forEach((leave) => {
        if (!byEmployee[leave.employeeId]) byEmployee[leave.employeeId] = [];
        byEmployee[leave.employeeId].push(leave);
      });
      setEmployeeLeaves(byEmployee);
    } catch (error) {
      toast.error((error as Error).message || "Failed to load leave requests");
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleLeaveDecision = async () => {
    if (!leaveDecisionModal) return;
    const { leave, action } = leaveDecisionModal;
    if (action === "reject" && !leaveDecisionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setUploadingDocuments(true);
    try {
      const payload: any = { id: leave.id, action };
      if (action === "reject") {
        payload.rejectionReason = leaveDecisionReason.trim();
      } else if (action === "approve") {
        // For Annual/Vacation leave, include documents and message if provided
        if (leave.type === "Annual" && approvalDocuments.length > 0) {
          payload.approvalDocuments = approvalDocuments;
        }
        if (approvalMessage.trim()) {
          payload.approvalMessage = approvalMessage.trim();
        }
      }
      const updated: LeaveRequest = await authedFetch("/api/admin/leave", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEmployeeLeaves((prev) => {
        const copy: Record<string, LeaveRequest[]> = { ...prev };
        const list = copy[updated.employeeId] ?? [];
        copy[updated.employeeId] = list.map((l) => (l.id === updated.id ? updated : l));
        return copy;
      });
      // Update selected leave if it's the same one
      if (selectedLeaveForDetails?.id === updated.id) {
        setSelectedLeaveForDetails(updated);
      }
      toast.success(
        action === "approve" ? "Leave request approved" : "Leave request rejected"
      );
      setLeaveDecisionModal(null);
      setLeaveDecisionReason("");
      setApprovalDocuments([]);
      setApprovalMessage("");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update leave request");
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadLeavesForEmployee = async (employeeId: string) => {
    try {
      setLoadingLeaves(true);
      const leaves = await authedFetch(`/api/admin/leave?employeeId=${encodeURIComponent(employeeId)}`);
      setEmployeeLeaves((prev) => ({
        ...prev,
        [employeeId]: Array.isArray(leaves) ? leaves : [],
      }));
    } catch (error) {
      toast.error((error as Error).message || "Failed to load leave requests");
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleAssignWorkOrder = async (formData: FormData) => {
    try {
      if (!adminAuth) {
        toast.error("Please log in as admin first");
        return;
      }
      if (!assignCustomerId) {
        toast.error("Select a customer from the list");
        return;
      }
      const payload = {
        customerId: assignCustomerId,
        serviceTypeId: formData.get("serviceTypeId") || undefined,
        assignedEmployeeId: formData.get("assignedEmployeeId") || undefined,
        workDescription: formData.get("workDescription"),
        locationAddress: formData.get("locationAddress"),
        customerPhone: formData.get("customerPhone"),
        orderDateTime: formData.get("orderDateTime"),
        quotationReferenceNumber: formData.get("quotationReferenceNumber") || undefined,
        paymentMethod: formData.get("paymentMethod") || undefined,
      };
      const created = await authedFetch("/api/work-orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setWorkOrders((prev) => [created, ...prev]);
      toast.success("Work order created");
      setAssignCustomerName("");
      setAssignCustomerId(null);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleSaveDailySchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminAuth || adminAuth.businessUnit !== "PrintersUAE") {
      toast.error("Daily schedules are only available for Printers UAE");
      return;
    }
    const tasks = scheduleTasksText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const employeeIds = scheduleEmployeeIds.filter((id) => id.trim().length > 0);
    const employeeNames = scheduleEmployeeNames.filter((n) => n.trim().length > 0);
    if (employeeIds.length === 0 && employeeNames.length === 0) {
      toast.error("Select or enter at least one employee");
      return;
    }
    if (tasks.length === 0) {
      toast.error("Add at least one task");
      return;
    }
    try {
      const payload = {
        date: scheduleDate,
        employeeIds,
        employeeNames,
        tasks,
      };

      if (editingScheduleId) {
        const updated = await authedFetch("/api/daily-schedules", {
          method: "PUT",
          body: JSON.stringify({
            id: editingScheduleId,
            ...payload,
          }),
        });
        setDailySchedules((prev) => {
          const next = prev.map((s) => (s.id === updated.id ? updated : s));
          return next.sort((a, b) => {
            if (a.date === b.date)
              return (a.employeeNames[0] || "").localeCompare(b.employeeNames[0] || "");
            return b.date.localeCompare(a.date);
          });
        });
        toast.success("Daily schedule updated");
      } else {
        const created = await authedFetch("/api/daily-schedules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setDailySchedules((prev) => {
          const next = [created, ...prev.filter((s) => s.id !== created.id)];
          return next.sort((a, b) => {
            if (a.date === b.date)
              return (a.employeeNames[0] || "").localeCompare(b.employeeNames[0] || "");
            return b.date.localeCompare(a.date);
          });
        });
        toast.success("Daily schedule added");
      }

      setScheduleTasksText("");
      setScheduleEmployeeIds([]);
      setScheduleEmployeeNames([]);
      setScheduleEmployeeNamesInput("");
      setEditingScheduleId(null);
      setShowScheduleModal(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const toggleScheduleEmployee = (id: string) => {
    setScheduleEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const formatName = (entry: DailySchedule) => {
    if (Array.isArray(entry.employeeNames) && entry.employeeNames.length > 0) {
      return entry.employeeNames.join(" & ");
    }
    return ((entry as any).employeeName as string | undefined) ??
      (Array.isArray(entry.employeeIds) ? entry.employeeIds.join(", ") : "Team");
  };

  const combinedTasksForEntry = (entry: DailySchedule) => {
    const entryEmployeeIds = Array.isArray(entry.employeeIds) ? entry.employeeIds : [];
    const matchingWorkOrders = workOrders
      .filter((w) => w.status !== "Submitted")
      .filter((w) => (entryEmployeeIds.length === 0 ? false : entryEmployeeIds.includes(w.assignedEmployeeId || "")))
      .filter((w) => {
        const date = new Date(w.orderDateTime);
        const iso = date.toISOString().slice(0, 10);
        return iso === entry.date;
      })
      .map((w) => {
        const name = w.customerName ?? "Work order";
        const loc = w.locationAddress ? ` (${w.locationAddress})` : "";
        return `${name}${loc}`;
      });
    return [...entry.tasks.map((t) => t.text), ...matchingWorkOrders];
  };

  const handleShareSchedules = async () => {
    // When a date-range filter is active, share exactly what is shown in the
    // filtered list instead of only the single scheduleDate bucket.
    let entries: DailySchedule[] = [];
    let heading = "";

    if (filterActive) {
      if (!filterFromDate && !filterToDate) {
        toast.error("Select at least one date before sharing");
        return;
      }
      entries = dailySchedules;
      if (entries.length === 0) {
        toast.error("No schedules to share for the selected range");
        return;
      }
      if (filterFromDate && filterToDate) {
        heading = `Schedules from ${filterFromDate} to ${filterToDate}`;
      } else if (filterFromDate) {
        heading = `Schedules from ${filterFromDate}`;
      } else {
        heading = `Schedules up to ${filterToDate}`;
      }
    } else {
      const date = scheduleDate;
      if (!date) {
        toast.error("Select a date to share schedules");
        return;
      }
      entries = schedulesByDate[date] ?? [];
      if (entries.length === 0) {
        toast.error("No schedules to share for the selected date");
        return;
      }
      heading = `Schedules for ${date}`;
    }

    const lines: string[] = [];
    lines.push(heading);

    entries.forEach((entry) => {
      const name = formatName(entry);
      const tasks = combinedTasksForEntry(entry);
      const taskLines = tasks.map((t, idx) => `${idx + 1}. ${t}`).join("\n");
      lines.push(`${name}:\n${taskLines}`);
    });

    const text = lines.join("\n\n");

    try {
      if (typeof navigator !== "undefined" && (navigator as Navigator).share) {
        await (navigator as Navigator).share({
          title: heading,
          text,
        });
      } else {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, "_blank");
      }
    } catch (error) {
      toast.error((error as Error).message || "Unable to share schedule");
    }
  };

  const handleDeleteDailySchedule = async (id: string) => {
    const confirmDelete = window.confirm("Delete this daily schedule?");
    if (!confirmDelete) return;
    try {
      await authedFetch("/api/daily-schedules", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setDailySchedules((prev) => prev.filter((s) => s.id !== id));
      toast.success("Daily schedule deleted");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const startEditDailySchedule = (entry: DailySchedule) => {
    setEditingScheduleId(entry.id);
    setScheduleDate(entry.date);
    setScheduleEmployeeIds(Array.isArray(entry.employeeIds) ? entry.employeeIds : []);
    setScheduleEmployeeNames(Array.isArray(entry.employeeNames) ? entry.employeeNames : []);
    setScheduleEmployeeNamesInput(
      Array.isArray(entry.employeeNames) && entry.employeeNames.length > 0
        ? entry.employeeNames.join(", ")
        : ""
    );
    setScheduleTasksText(entry.tasks.map((t) => t.text).join("\n"));
    setShowScheduleModal(true);
  };

  const startEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditName(emp.name);
    setEditRole(emp.role);
    setEditStatus(emp.status);
    setEditPassword("");
    setEditFeatureAccess(emp.featureAccess || []);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployeeId) return;
    try {
      const payload: Record<string, unknown> = {
        id: editingEmployeeId,
        name: editName,
        role: editRole,
        status: editStatus,
        featureAccess: editFeatureAccess,
      };
      if (editPassword) payload.password = editPassword;
      const updated = await authedFetch("/api/employees", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      toast.success("Employee updated");
      setEditingEmployeeId(null);
      setEditPassword("");
      setEditFeatureAccess([]);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const confirm = window.confirm("Delete this employee? This will unassign their jobs.");
    if (!confirm) return;
    try {
      await authedFetch("/api/employees", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      setWorkOrders((prev) =>
        prev.map((w) =>
          w.assignedEmployeeId === id ? { ...w, assignedEmployeeId: undefined, status: "Draft" } : w
        )
      );
      toast.success("Employee deleted");
      if (editingEmployeeId === id) {
        setEditingEmployeeId(null);
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const startEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setEditCustomerName(customer.name);
    setEditCustomerContact(customer.contact || "");
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomerId) return;
    try {
      const updated = await authedFetch("/api/customers", {
        method: "PUT",
        body: JSON.stringify({
          id: editingCustomerId,
          name: editCustomerName,
          contact: editCustomerContact || undefined,
        }),
      });
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? { id: updated.id, name: updated.name, contact: updated.contact } : c)));
      toast.success("Customer updated");
      setEditingCustomerId(null);
      setEditCustomerName("");
      setEditCustomerContact("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const confirm = window.confirm("Delete this customer? This will remove all associated work orders.");
    if (!confirm) return;
    try {
      await authedFetch("/api/customers", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast.success("Customer deleted");
      if (editingCustomerId === id) {
        setEditingCustomerId(null);
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const startEditWorkOrder = (wo: WorkOrder) => {
    setEditingWorkOrderId(wo.id);
    setEditWorkOrderCustomerId(wo.customerId);
    setEditWorkOrderCustomerName(customers.find((c) => c.id === wo.customerId)?.name || "");
    setEditWorkOrderServiceTypeId(wo.serviceTypeId || "");
    setEditWorkOrderAssignedEmployeeId(wo.assignedEmployeeId || "");
    setEditWorkOrderDescription(wo.workDescription);
    setEditWorkOrderLocationAddress(wo.locationAddress);
    setEditWorkOrderCustomerPhone(wo.customerPhone);
    setEditWorkOrderQuotationReferenceNumber(wo.quotationReferenceNumber || "");
    setEditWorkOrderPaymentMethod(wo.paymentMethod || "");
    // Format datetime-local input (remove seconds and milliseconds)
    const dateTime = new Date(wo.orderDateTime);
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, "0");
    const day = String(dateTime.getDate()).padStart(2, "0");
    const hours = String(dateTime.getHours()).padStart(2, "0");
    const minutes = String(dateTime.getMinutes()).padStart(2, "0");
    setEditWorkOrderDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const handleUpdateWorkOrder = async () => {
    if (!editingWorkOrderId) return;
    if (!editWorkOrderCustomerId) {
      toast.error("Please select a customer");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        id: editingWorkOrderId,
        customerId: editWorkOrderCustomerId,
        workDescription: editWorkOrderDescription,
        locationAddress: editWorkOrderLocationAddress,
        customerPhone: editWorkOrderCustomerPhone,
        orderDateTime: editWorkOrderDateTime,
        quotationReferenceNumber: editWorkOrderQuotationReferenceNumber || undefined,
        paymentMethod: editWorkOrderPaymentMethod || undefined,
      };
      if (editWorkOrderServiceTypeId) {
        payload.serviceTypeId = editWorkOrderServiceTypeId;
      } else {
        payload.serviceTypeId = null;
      }
      if (editWorkOrderAssignedEmployeeId) {
        payload.assignedEmployeeId = editWorkOrderAssignedEmployeeId;
      } else {
        payload.assignedEmployeeId = null;
      }
      const updated = await authedFetch("/api/work-orders", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      toast.success("Work order updated");
      setEditingWorkOrderId(null);
      // Reload data to get updated employee statuses
      await loadAdminData();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteWorkOrder = async (id: string) => {
    const confirm = window.confirm("Delete this work order? This action cannot be undone.");
    if (!confirm) return;
    try {
      await authedFetch("/api/work-orders", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      setWorkOrders((prev) => prev.filter((w) => w.id !== id));
      toast.success("Work order deleted");
      if (editingWorkOrderId === id) {
        setEditingWorkOrderId(null);
      }
      // Reload data to get updated employee statuses
      await loadAdminData();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleUpdateTicketStatus = async (id: string, status: TicketStatus) => {
    try {
      const updated = await authedFetch("/api/tickets", {
        method: "PUT",
        body: JSON.stringify({ id, status }),
      });
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success("Ticket status updated");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };


  const scrollToDashboard = () => {
    setActiveTab("dashboard");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const theme = useMemo(() => {
    switch (adminAuth?.businessUnit) {
      case "G3":
        return { text: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50" };
      case "IT":
        return { text: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" };
      default:
        return { text: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" };
    }
  }, [adminAuth?.businessUnit]);

  const currentScheduleEntries = useMemo(() => {
    if (filterActive) {
      return dailySchedules;
    }
    return schedulesByDate[scheduleDate] ?? [];
  }, [filterActive, dailySchedules, schedulesByDate, scheduleDate]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-900">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-24 md:pb-12 space-y-6">
        {adminAuth && (
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 bg-slate-900/60 backdrop-blur-md z-20 py-3 px-3 rounded-2xl md:static md:bg-transparent md:p-0">
            <div>
              <p className="text-slate-300 text-sm uppercase tracking-wide">
                Service Portals Control
              </p>
              <h1 className="text-3xl font-bold text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-indigo-200 mt-1">
                Scoped to business unit: {adminAuth.businessUnit}
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 items-center">
              {(adminAuth.role === "admin" || adminAuth.featureAccess?.includes("advertisements")) && (
                <button
                  type="button"
                  onClick={() => setShowAdvertisementModal(true)}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                  title="Send advertisement"
                >
                  <RiAdvertisementFill className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              {(adminAuth.role === "admin" || adminAuth.featureAccess?.includes("notifications")) && (
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(true)}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                  title="Send notification"
                >
                  <AiFillNotification className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition"
                  title="Notifications"
                >
                  <IoNotifications className="w-4 h-4 sm:w-5 sm:h-5" />
                  {totalNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-rose-500 text-[10px] sm:text-[11px] font-semibold flex items-center justify-center border border-white shadow-sm">
                      {totalNotificationCount > 9 ? "9+" : totalNotificationCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowAdminProfile(true)}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center hover:bg-white/25 transition"
                title="Admin profile"
              >
                <FaUserShield className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </header>
        )}

        {!adminAuth && (
          <div className="relative min-h-[70vh] flex items-center justify-center">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl animate-pulse" />
              <div className="absolute right-0 bottom-0 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
            </div>
            <div className="relative w-full max-w-4xl space-y-6">
              <div className="text-center text-white animate-fade-in">
                <p className="text-sm uppercase tracking-[0.2em] text-white/70">Admin Access</p>
                <h1 className="text-3xl font-bold mt-1">Choose Business Unit</h1>
                <p className="text-sm text-white/80">
                  Pick your BU, then enter the admin password to continue.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
                {[
                  { key: "printers", label: "Printers UAE", bu: "PrintersUAE" as BusinessUnit, gradient: "from-blue-600 to-purple-600" },
                  { key: "g3", label: "G3 Facility", bu: "G3" as BusinessUnit, gradient: "from-emerald-600 to-teal-600" },
                  { key: "it", label: "IT Services", bu: "IT" as BusinessUnit, gradient: "from-purple-600 to-violet-600" },
                ].map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => {
                      setSelectedBu(card.bu);
                      setShowLoginModal(true);
                    }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md shadow-xl hover:shadow-2xl hover:-translate-y-1 transition group text-left"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-70 group-hover:opacity-90 transition`} />
                    <div className="relative px-5 py-6 text-white space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
                        {card.label.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs text-white/80">Business Unit</p>
                        <h3 className="text-xl font-semibold">{card.label}</h3>
                      </div>
                      <p className="text-xs text-white/80">Click to proceed with BU-scoped admin login.</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showLoginModal && !adminAuth && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          >
            <div
              className="w-full max-w-lg bg-white/95 text-slate-900 rounded-3xl shadow-2xl border border-white/40 overflow-hidden animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/80">Admin Login</p>
                  <h2 className="text-xl font-bold mt-1">
                    {selectedBu ? `${selectedBu} Admin` : "Select BU"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-full bg-white/20 hover:bg-white/30 p-2 text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 sm:p-7 space-y-4">
                <p className="text-sm text-slate-700">
                  Enter the admin password for{" "}
                  <span className="font-semibold">{selectedBu ?? "the selected business unit"}</span>.
                </p>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdminLogin(new FormData(e.currentTarget));
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showAdminPassword ? "text" : "password"}
                        required
                        placeholder={selectedBu ? "Enter admin password" : "Select BU first"}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-200 transition"
                        disabled={!selectedBu}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                        aria-label={showAdminPassword ? "Hide password" : "Show password"}
                      >
                        {showAdminPassword ? (
                          <FaEye className="w-5 h-5" />
                        ) : (
                          <FaRegEye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    disabled={loading || !selectedBu}
                    className="w-full bg-gradient-to-r from-indigo-600 to-emerald-500 text-white rounded-xl py-3 font-semibold shadow-lg shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>
                <p className="text-xs text-slate-500">
                  BU-scoped admins: PrintersUAE, G3, IT with their respective passwords.
                </p>
              </div>
            </div>
          </div>
        )}

        {adminAuth && (
          <section className="space-y-4 animate-fade-in">
            <div
              className={`grid gap-4 ${
                isSidebarCollapsed ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[260px_1fr]"
              }`}
            >
              <aside
                className={`hidden md:flex flex-col bg-white/10 border border-white/10 rounded-2xl shadow-xl ${
                  isSidebarCollapsed ? "p-2 items-center gap-2" : "p-4 gap-2"
                }`}
              >
                <div className="flex items-center w-full justify-between mb-1">
                  {!isSidebarCollapsed && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
                      Admin Menu
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white/80 hover:bg-white/20 text-xs"
                    aria-label="Toggle sidebar"
                  >
                    {isSidebarCollapsed ? "»" : "«"}
                  </button>
                </div>

                <div className="flex-1 space-y-2 w-full">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-white/20 text-white shadow translate-x-1"
                          : "text-white/80 hover:bg-white/10 hover:translate-x-1"
                      }`}
                    >
                      <span
                        className={`flex items-center gap-2 ${
                          isSidebarCollapsed ? "justify-center" : "justify-between"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5">
                            {tab.icon}
                          </span>
                          {!isSidebarCollapsed && <span>{tab.label}</span>}
                        </span>
                        {!isSidebarCollapsed && (
                          <>
                            {tab.id === "assets" && assetNotificationCount > 0 && (
                              <span className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[11px] px-2 py-0.5">
                                {assetNotificationCount > 9 ? "9+" : assetNotificationCount}
                              </span>
                            )}
                            {tab.id === "payroll" && pendingLeaveCount > 0 && (
                              <span className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[11px] px-2 py-0.5">
                                {pendingLeaveCount > 9 ? "9+" : pendingLeaveCount}
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="space-y-4">
                {activeTab === "dashboard" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        {
                          id: "customers",
                          label: "Customers",
                          value: customers.length,
                          accent: "from-sky-500 to-indigo-500",
                        },
                        {
                          id: "serviceTypes",
                          label: "Service Types",
                          value: serviceTypes.length,
                          accent: "from-emerald-500 to-teal-500",
                        },
                        {
                          id: "availableStaff",
                          label: "Available Staff",
                          value: availableCount,
                          accent: "from-amber-500 to-orange-500",
                        },
                        {
                          id: "assignedJobs",
                          label: "Assigned Jobs",
                          value: assignedCount,
                          accent: "from-fuchsia-500 to-purple-500",
                        },
                        {
                          id: "openTickets",
                          label: "Open Tickets",
                          value: openTicketCount,
                          accent: "from-rose-500 to-orange-500",
                        },
                        {
                          id: "payroll",
                          label: "Payroll",
                          value: payrolls.length,
                          accent: "from-blue-500 to-cyan-500",
                        },
                        ...(adminAuth?.businessUnit === "PrintersUAE"
                          ? [
                              {
                                id: "rentalMachines",
                                label: "Rental Machines",
                                value: rentalMachines.length,
                                accent: "from-amber-500 to-yellow-500",
                              } as const,
                            ]
                          : []),
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveDashboardPanel(item.id as any)}
                          className={`rounded-2xl bg-gradient-to-br ${item.accent} text-white p-4 shadow-xl border border-white/10 text-left hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/60`}
                        >
                          <p className="text-sm uppercase tracking-wide text-white/80">{item.label}</p>
                          <p className="text-3xl font-bold mt-1">{item.value}</p>
                        </button>
                      ))}
                    </div>

                    {activeDashboardPanel === "customers" && (
                      <div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
                        onClick={() => setActiveDashboardPanel(null)}
                      >
                        <div
                          className="w-full max-w-3xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Card
                            title="Customers"
                            action={
                              <button
                                type="button"
                                onClick={() => setActiveDashboardPanel(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                                aria-label="Close customers modal"
                              >
                                ✕
                              </button>
                            }
                          >
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                              {customers.length === 0 ? (
                                <p className="text-sm text-slate-500">No customers yet.</p>
                              ) : (
                                customers.map((c) => {
                                  const isEditing = editingCustomerId === c.id;
                                  return (
                                    <div
                                      key={c.id}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white"
                                    >
                                      {isEditing ? (
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                          <input
                                            value={editCustomerName}
                                            onChange={(ev) => setEditCustomerName(ev.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                            placeholder="Customer name"
                                          />
                                          <input
                                            value={editCustomerContact}
                                            onChange={(ev) => setEditCustomerContact(ev.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                            placeholder="Contact"
                                          />
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900">{c.name}</p>
                                            {c.contact && (
                                              <p className="text-xs text-slate-500 truncate">{c.contact}</p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => startEditCustomer(c)}
                                              className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                                              title="Edit"
                                            >
                                              <MdModeEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCustomer(c.id)}
                                              className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                                              title="Delete"
                                            >
                                              <MdDelete className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            {editingCustomerId && (
                              <div className="mt-4 border-t border-slate-200 pt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleUpdateCustomer}
                                  className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  Save Changes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCustomerId(null);
                                    setEditCustomerName("");
                                    setEditCustomerContact("");
                                  }}
                                  className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </Card>
                        </div>
                      </div>
                    )}

                    {activeDashboardPanel === "serviceTypes" && (
                      <div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
                        onClick={() => setActiveDashboardPanel(null)}
                      >
                        <div
                          className="w-full max-w-3xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Card
                            title="Service Types"
                            action={
                              <button
                                type="button"
                                onClick={() => setActiveDashboardPanel(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                                aria-label="Close service types modal"
                              >
                                ✕
                              </button>
                            }
                          >
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                              {serviceTypes.length === 0 ? (
                                <p className="text-sm text-slate-500">No service types yet.</p>
                              ) : (
                                serviceTypes.map((s) => (
                                  <div
                                    key={s.id}
                                    className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
                                  >
                                    <p className="text-sm font-medium text-slate-900">{s.name}</p>
                                    {s.description && (
                                      <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>
                    )}

                    {activeDashboardPanel === "availableStaff" && (
                      <div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
                        onClick={() => setActiveDashboardPanel(null)}
                      >
                        <div
                          className="w-full max-w-3xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Card
                            title="Staff Overview"
                            action={
                              <button
                                type="button"
                                onClick={() => setActiveDashboardPanel(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                                aria-label="Close staff modal"
                              >
                                ✕
                              </button>
                            }
                          >
                            <div className="grid md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                                  Available staff
                                </p>
                                {employees.filter((e) => e.status === "Available").length === 0 ? (
                                  <p className="text-sm text-slate-500">
                                    No staff currently marked as available.
                                  </p>
                                ) : (
                                  employees
                                    .filter((e) => e.status === "Available")
                                    .map((e) => (
                                      <div
                                        key={e.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 px-3 py-2 bg-emerald-50"
                                      >
                                        <div>
                                          <p className="text-sm font-medium text-slate-900">{e.name}</p>
                                          <p className="text-xs text-slate-600">{e.role}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeColor(
                                              e.status
                                            )}`}
                                          >
                                            {e.status}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => startEditEmployee(e)}
                                            className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                                            title="Edit"
                                          >
                                            <MdModeEdit className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteEmployee(e.id)}
                                            className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                                            title="Delete"
                                          >
                                            <MdDelete className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                  Unavailable staff
                                </p>
                                {employees.filter((e) => e.status !== "Available").length === 0 ? (
                                  <p className="text-sm text-slate-500">
                                    No staff currently marked as unavailable.
                                  </p>
                                ) : (
                                  employees
                                    .filter((e) => e.status !== "Available")
                                    .map((e) => (
                                      <div
                                        key={e.id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white"
                                      >
                                        <div>
                                          <p className="text-sm font-medium text-slate-900">{e.name}</p>
                                          <p className="text-xs text-slate-600">{e.role}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeColor(
                                              e.status
                                            )}`}
                                          >
                                            {e.status}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => startEditEmployee(e)}
                                            className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                                            title="Edit"
                                          >
                                            <MdModeEdit className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteEmployee(e.id)}
                                            className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                                            title="Delete"
                                          >
                                            <MdDelete className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                )}
                              </div>
                            </div>

                            {employees.some((e) => e.id === editingEmployeeId) && (
                              <div className="mt-4 border-t border-slate-200 pt-3">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                  Edit employee
                                </p>
                                <div className="grid md:grid-cols-2 gap-3">
                                  <input
                                    value={editName}
                                    onChange={(ev) => setEditName(ev.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Employee name"
                                  />
                                  <input
                                    value={editRole}
                                    onChange={(ev) => setEditRole(ev.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Role"
                                  />
                                  <select
                                    value={editStatus}
                                    onChange={(ev) =>
                                      setEditStatus(ev.target.value as EmployeeStatus)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  >
                                    <option value="Available">Available</option>
                                    <option value="Unavailable">Unavailable</option>
                                  </select>
                                  <div className="relative">
                                    <input
                                      type={showEditEmployeePassword ? "text" : "password"}
                                      value={editPassword}
                                      onChange={(ev) => setEditPassword(ev.target.value)}
                                      placeholder="New password (optional)"
                                      className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowEditEmployeePassword((prev) => !prev)
                                      }
                                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                                      aria-label={
                                        showEditEmployeePassword ? "Hide password" : "Show password"
                                      }
                                    >
                                      {showEditEmployeePassword ? (
                                        <FaEye className="w-4 h-4" />
                                      ) : (
                                        <FaRegEye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-200">
                                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    Feature Access
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { key: "payroll", label: "Payroll" },
                                      { key: "assets", label: "Assets" },
                                      { key: "tickets", label: "Tickets" },
                                      { key: "schedule_works", label: "Schedule Works" },
                                      { key: "dashboard", label: "Dashboard" },
                                      { key: "setup", label: "Setup" },
                                      { key: "notifications", label: "Notifications" },
                                      { key: "advertisements", label: "Advertisements" },
                                    ].map((feature) => (
                                      <label key={feature.key} className="flex items-center gap-2 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={editFeatureAccess.includes(feature.key)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setEditFeatureAccess([...editFeatureAccess, feature.key]);
                                            } else {
                                              setEditFeatureAccess(editFeatureAccess.filter((f) => f !== feature.key));
                                            }
                                          }}
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>{feature.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEmployeeId(null);
                                      setEditName("");
                                      setEditRole("");
                                      setEditStatus("Available");
                                      setEditPassword("");
                                      setEditFeatureAccess([]);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleUpdateEmployee}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500"
                                  >
                                    Save changes
                                  </button>
                                </div>
                              </div>
                            )}
                          </Card>
                        </div>
                      </div>
                    )}

                    {activeDashboardPanel === "assignedJobs" && (
                      <div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
                        onClick={() => setActiveDashboardPanel(null)}
                      >
                        <div
                          className="w-full max-w-3xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Card
                            title="Assigned Jobs"
                            action={
                              <button
                                type="button"
                                onClick={() => setActiveDashboardPanel(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                                aria-label="Close assigned jobs modal"
                              >
                                ✕
                              </button>
                            }
                          >
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                              {workOrders.filter((w) => w.status === "Assigned").length === 0 ? (
                                <p className="text-sm text-slate-500">No assigned jobs currently.</p>
                              ) : (
                                workOrders
                                  .filter((w) => w.status === "Assigned")
                                  .map((w) => (
                                    <div
                                      key={w.id}
                                      className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
                                    >
                                      <p className="text-sm font-medium text-slate-900">
                                        {w.customerName ?? "Unnamed customer"}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {w.workDescription.slice(0, 80)}
                                        {w.workDescription.length > 80 ? "..." : ""}
                                      </p>
                                    </div>
                                  ))
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>
                    )}

                    {activeDashboardPanel === "openTickets" && (
                      <div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
                        onClick={() => setActiveDashboardPanel(null)}
                      >
                        <div
                          className="w-full max-w-3xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Card
                            title="Open Tickets"
                            action={
                              <button
                                type="button"
                                onClick={() => setActiveDashboardPanel(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                                aria-label="Close open tickets modal"
                              >
                                ✕
                              </button>
                            }
                          >
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                              {tickets.filter((t) => t.status !== "Closed").length === 0 ? (
                                <p className="text-sm text-slate-500">No open tickets.</p>
                              ) : (
                                tickets
                                  .filter((t) => t.status !== "Closed")
                                  .map((t) => (
                                    <div
                                      key={t.id}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white"
                                    >
                                      <div>
                                        <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                          {t.subject}
                                        </p>
                                        <p className="text-xs text-slate-500 line-clamp-2">
                                          {t.description}
                                        </p>
                                      </div>
                                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                        {t.status}
                                      </span>
                                    </div>
                                  ))
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>
                    )}

                    {activeDashboardPanel === "payroll" && (
                      <div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
                        onClick={() => setActiveDashboardPanel(null)}
                      >
                        <div
                          className="w-full max-w-3xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Card
                            title="Payroll"
                            action={
                              <button
                                type="button"
                                onClick={() => setActiveDashboardPanel(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                                aria-label="Close payroll modal"
                              >
                                ✕
                              </button>
                            }
                          >
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                              {payrolls.length === 0 ? (
                                <p className="text-sm text-slate-500">No payroll records yet.</p>
                              ) : (
                                payrolls.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 bg-white"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">
                                        {p.employeeName}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Period: {p.period} • Net: {p.netPay} AED
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                      {p.status}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>
                    )}

                    {activeDashboardPanel === "rentalMachines" && adminAuth?.businessUnit === "PrintersUAE" && (
                      <div
                        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8"
                        onClick={() => setActiveDashboardPanel(null)}
                      >
                        <div
                          className="w-full max-w-3xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Card
                            title="Rental Machines"
                            action={
                              <button
                                type="button"
                                onClick={() => setActiveDashboardPanel(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm"
                                aria-label="Close rental machines modal"
                              >
                                ✕
                              </button>
                            }
                          >
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                              {rentalMachines.length === 0 ? (
                                <p className="text-sm text-slate-500">No rental machines recorded.</p>
                              ) : (
                                rentalMachines.map((m: any) => (
                                  <div
                                    key={m.id}
                                    className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
                                  >
                                    <p className="text-sm font-medium text-slate-900">
                                      {m.customerName ?? "Customer"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {m.modelName ?? "Model"} • UID: {m.uidNumber ?? "—"}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "assets" && (
                  <div className="space-y-4">
                    <Card title="Assets Overview" accent="bg-indigo-500">
                      {assetsSummary ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {[
                            { label: "Vehicles", key: "vehicles" as const, value: assetsSummary.categories.vehicles.active },
                            {
                              label: "Registrations",
                              key: "registrations" as const,
                              value: assetsSummary.categories.registrations.active,
                            },
                            {
                              label: "Bills & Contracts",
                              key: "bills_contracts" as const,
                              value: assetsSummary.categories.bills_contracts.active,
                            },
                            {
                              label: "IT & Equipment",
                              key: "it_equipment" as const,
                              value: assetsSummary.categories.it_equipment.active,
                            },
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                setActiveAssetsCategory(item.key);
                                setShowAssetsModal(true);
                              }}
                              className="rounded-2xl bg-white/90 text-slate-900 p-4 shadow border border-slate-200 flex flex-col gap-1 text-left hover:shadow-lg hover:-translate-y-0.5 transition group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 relative"
                            >
                              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                              <p className="text-2xl font-bold">{item.value}</p>
                              {expiringAssetCountsByCategory[item.key] > 0 && (
                                <span className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] px-2 py-0.5 shadow">
                                  {expiringAssetCountsByCategory[item.key] > 99
                                    ? "99+"
                                    : expiringAssetCountsByCategory[item.key]}
                                </span>
                              )}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAssetsCategory("employee_documents");
                              setShowAssetsModal(true);
                            }}
                            className="rounded-2xl bg-sky-50 text-slate-900 p-4 shadow border border-sky-100 flex flex-col gap-1 text-left hover:shadow-lg hover:-translate-y-0.5 transition group focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                          >
                            <p className="text-xs uppercase tracking-wide text-sky-600">
                              Employee Documents
                            </p>
                            <p className="text-2xl font-bold">{employees.length}</p>
                            <p className="text-[11px] text-slate-500">
                              Contracts, visas, Emirates IDs, medicals and other HR records.
                            </p>
                          </button>
                          {adminAuth?.businessUnit === "PrintersUAE" && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAssetsCategory("rental_machines");
                                setShowAssetsModal(true);
                              }}
                              className="rounded-2xl bg-amber-50 text-slate-900 p-4 shadow border border-amber-100 flex flex-col gap-1 text-left hover:shadow-lg hover:-translate-y-0.5 transition group focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                            >
                              <p className="text-xs uppercase tracking-wide text-amber-600">
                                Rental Machines
                              </p>
                              <p className="text-2xl font-bold">{rentalMachines.length}</p>
                              <p className="text-[11px] text-slate-500">
                                Copier machines rented to customers.
                              </p>
                            </button>
                          )}
                          <div className="rounded-2xl bg-emerald-50 text-emerald-900 p-4 shadow border border-emerald-100 flex flex-col gap-1">
                            <p className="text-xs uppercase tracking-wide text-emerald-600">Upcoming dates</p>
                            <p className="text-2xl font-bold">{assetsSummary.dates.upcoming}</p>
                          </div>
                          <div className="rounded-2xl bg-rose-50 text-rose-900 p-4 shadow border border-rose-100 flex flex-col gap-1">
                            <p className="text-xs uppercase tracking-wide text-rose-600">Overdue dates</p>
                            <p className="text-2xl font-bold">{assetsSummary.dates.overdue}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          No assets summary available yet. Start adding vehicles, registrations, and other assets.
                        </p>
                      )}
                    </Card>

                    <Card
                      title="Upcoming & Overdue Expiries"
                      accent="bg-emerald-500"
                      action={
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const dates = await authedFetch("/api/assets/dates?windowDays=90");
                                setAssetDates(Array.isArray(dates) ? dates : []);
                                toast.success("Expiry list refreshed");
                              } catch (error) {
                                toast.error((error as Error).message);
                              }
                            }}
                            className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs hover:bg-white"
                          >
                            Refresh
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/assets/export?days=90", {
                                  credentials: "include",
                                });
                                if (!res.ok) {
                                  const body = await res.json().catch(() => ({}));
                                  throw new Error(body.error || "Export failed");
                                }
                                const blob = await res.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "assets-expiry.csv";
                                a.click();
                                window.URL.revokeObjectURL(url);
                              } catch (error) {
                                toast.error((error as Error).message);
                              }
                            }}
                            className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs hover:bg-indigo-500"
                          >
                            Export CSV
                          </button>
                        </div>
                      }
                    >
                      {assetDates.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No upcoming or overdue dates in the next 90 days.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs md:text-sm">
                            <thead>
                              <tr className="text-left text-slate-500 border-b border-slate-100">
                                <th className="py-2 pr-3">Category</th>
                                <th className="py-2 pr-3">Date Type</th>
                                <th className="py-2 pr-3">Date</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2 pr-3">Days</th>
                                <th className="py-2 pr-3">Asset Id</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {assetDates.map((d) => (
                                <tr key={d.id}>
                                  <td className="py-1.5 pr-3 capitalize">
                                    {d.categoryKey.replace(/_/g, " ")}
                                  </td>
                                  <td className="py-1.5 pr-3 capitalize">
                                    {d.dateType.replace(/_/g, " ")}
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    {new Date(d.dateValue).toLocaleDateString()}
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] ${
                                        d.status === "overdue"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {d.status}
                                    </span>
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    {d.status === "overdue" ? `-${Math.abs(d.daysUntil)}` : d.daysUntil}
                                  </td>
                                  <td className="py-1.5 pr-3 text-slate-500">{d.assetId}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>

                    <AssetsModal
                      isOpen={showAssetsModal}
                      onClose={() => setShowAssetsModal(false)}
                      categoryKey={activeAssetsCategory}
                      authedFetch={authedFetch}
                      onAssetChanged={async () => {
                        await refreshAssetsMeta();
                        // Reload rental machines and copier models when rental_machines category is active and business unit is PrintersUAE
                        if (activeAssetsCategory === "rental_machines" && adminAuth?.businessUnit === "PrintersUAE") {
                          try {
                            const rentalMachinesData = await authedFetch("/api/assets/rental-machines");
                            setRentalMachines(Array.isArray(rentalMachinesData) ? rentalMachinesData : []);
                          } catch {
                            setRentalMachines([]);
                          }
                          try {
                            const copierModelsData = await authedFetch("/api/assets/copier-models");
                            setCopierModels(Array.isArray(copierModelsData) ? copierModelsData : []);
                          } catch {
                            setCopierModels([]);
                          }
                        }
                      }}
                      employees={employees.map((e) => ({ id: e.id, name: e.name }))}
                      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
                      copierModels={adminAuth?.businessUnit === "PrintersUAE" ? copierModels : []}
                    />

                  </div>
                )}

                {activeTab === "setup" && (
                  <div className="grid lg:grid-cols-2 gap-4">
                    <Card title="Create Customer">
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateCustomer(new FormData(e.currentTarget));
                          e.currentTarget.reset();
                        }}
                      >
                        <input
                          name="name"
                          placeholder="Customer name"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          required
                        />
                        <button className="w-full bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-500">
                          Add customer
                        </button>
                      </form>
                    </Card>

                    <Card title="Bulk import (.xlsx)">
                      <p className="text-sm text-slate-700 mb-2">
                        Put customer names in the first column of the first sheet.
                      </p>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImportCustomers(file);
                            e.target.value = "";
                          }
                        }}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {importingCustomers && (
                        <p className="text-xs text-slate-500 mt-2">Importing customers...</p>
                      )}
                    </Card>
                  </div>
                )}

                {activeTab === "setup" && (
                  <Card title="Add Service Type">
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCreateServiceType(new FormData(e.currentTarget));
                        e.currentTarget.reset();
                      }}
                    >
                      <input
                        name="name"
                        placeholder="Service type name"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        required
                      />
                      <button className="w-full bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-500">
                        Add service type
                      </button>
                    </form>
                  </Card>
                )}

                {activeTab === "setup" && (
                  <div className="space-y-4">
                    <Card title="Create Employee">
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateEmployee(new FormData(e.currentTarget));
                          e.currentTarget.reset();
                        }}
                      >
                        <input
                          name="name"
                          placeholder="Employee name"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          required
                        />
                        <div className="relative">
                          <input
                            name="password"
                            placeholder="Password"
                            type={showCreateEmployeePassword ? "text" : "password"}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCreateEmployeePassword((prev) => !prev)
                            }
                            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                            aria-label={
                              showCreateEmployeePassword ? "Hide password" : "Show password"
                            }
                          >
                            {showCreateEmployeePassword ? (
                              <FaEye className="w-5 h-5" />
                            ) : (
                              <FaRegEye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <input
                          name="role"
                          placeholder="Role (Engineer/Technician)"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          required
                        />
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Feature Access</p>
                            <p className="text-xs text-slate-500 italic">(Optional)</p>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">
                            Select features to grant access. Leave unchecked to create employee without admin portal access.
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_payroll"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Payroll</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_assets"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Assets</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_tickets"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Tickets</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_schedule_works"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Schedule Works</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_dashboard"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Dashboard</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_setup"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Setup</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_notifications"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Notifications</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="feature_advertisements"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Advertisements</span>
                            </label>
                          </div>
                        </div>
                        <button className="w-full bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-500">
                          Add employee
                        </button>
                      </form>
                    </Card>

                    <Card title="Employees" accent="bg-amber-500">
                      <ul className="space-y-2">
                        {employees.map((e) => {
                          const isEditing = editingEmployeeId === e.id;
                          return (
                            <li
                              key={e.id}
                              className="p-3 rounded-lg border border-slate-100 bg-slate-50/70"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="cursor-pointer" onClick={() => startEditEmployee(e)}>
                                  <p className="font-medium">{e.name}</p>
                                  <p className="text-xs text-slate-500">{e.role}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-1 text-xs rounded-full ring-1 ${badgeColor(
                                      e.status
                                    )}`}
                                  >
                                    {e.status}
                                  </span>
                                  <button
                                    onClick={() => startEditEmployee(e)}
                                    className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                                    title="Edit"
                                  >
                                    <MdModeEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(e.id)}
                                    className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                                    title="Delete"
                                  >
                                    <MdDelete className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              {isEditing && (
                                <div className="mt-3 grid md:grid-cols-2 gap-3">
                                  <input
                                    value={editName}
                                    onChange={(ev) => setEditName(ev.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                  />
                                  <input
                                    value={editRole}
                                    onChange={(ev) => setEditRole(ev.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                  />
                                  <select
                                    value={editStatus}
                                    onChange={(ev) => setEditStatus(ev.target.value as EmployeeStatus)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                  >
                                    <option value="Available">Available</option>
                                    <option value="Unavailable">Unavailable</option>
                                  </select>
                                  <div className="relative">
                                    <input
                                      type={showEditEmployeePassword ? "text" : "password"}
                                      value={editPassword}
                                      onChange={(ev) => setEditPassword(ev.target.value)}
                                      placeholder="New password (optional)"
                                      className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowEditEmployeePassword((prev) => !prev)
                                      }
                                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                                      aria-label={
                                        showEditEmployeePassword ? "Hide password" : "Show password"
                                      }
                                    >
                                      {showEditEmployeePassword ? (
                                        <FaEye className="w-5 h-5" />
                                      ) : (
                                        <FaRegEye className="w-5 h-5" />
                                      )}
                                    </button>
                                  </div>
                                  <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-200">
                                    <p className="text-sm font-semibold text-slate-700">Feature Access</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { key: "payroll", label: "Payroll" },
                                        { key: "assets", label: "Assets" },
                                        { key: "tickets", label: "Tickets" },
                                        { key: "schedule_works", label: "Schedule Works" },
                                        { key: "dashboard", label: "Dashboard" },
                                        { key: "setup", label: "Setup" },
                                        { key: "notifications", label: "Notifications" },
                                        { key: "advertisements", label: "Advertisements" },
                                      ].map((feature) => (
                                        <label key={feature.key} className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={editFeatureAccess.includes(feature.key)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setEditFeatureAccess([...editFeatureAccess, feature.key]);
                                              } else {
                                                setEditFeatureAccess(editFeatureAccess.filter((f) => f !== feature.key));
                                              }
                                            }}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                          />
                                          <span>{feature.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="md:col-span-2 flex gap-2">
                                    <button
                                      onClick={handleUpdateEmployee}
                                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingEmployeeId(null);
                                        setEditFeatureAccess([]);
                                      }}
                                      className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                        {employees.length === 0 && (
                          <p className="text-sm text-slate-500">No employees yet.</p>
                        )}
                      </ul>
                    </Card>
                  </div>
                )}

                {activeTab === "payroll" && (
                  <div className="space-y-4">
                    <Card title="Payroll" accent="bg-indigo-500">
                      <div className="space-y-6">
                        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] gap-4">
                          <div className="space-y-3">
                            <p className="text-sm text-slate-700">
                              Generate monthly payroll entries for employees in this business unit.
                            </p>
                            <PayrollForm
                              employees={employees as any}
                              onSuccess={async () => {
                                try {
                                  const data = await authedFetch("/api/payroll");
                                  setPayrolls(Array.isArray(data) ? data : []);
                                } catch (error) {
                                  toast.error((error as Error).message);
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-900">
                                Recent Payrolls
                              </h3>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const data = await authedFetch("/api/payroll");
                                    setPayrolls(Array.isArray(data) ? data : []);
                                  } catch (error) {
                                    toast.error((error as Error).message);
                                  }
                                }}
                                className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                              >
                                Refresh
                              </button>
                            </div>
                            <PayrollList
                              payrolls={payrolls}
                              employees={employees.map((e) => ({ id: e.id, name: e.name }))}
                              onMarkCompleted={(id) => {
                                setPayrolls((prev) =>
                                  prev.map((p) =>
                                    p.id === id
                                      ? {
                                          ...p,
                                          status: "Completed",
                                          completedAt: new Date().toISOString(),
                                        }
                                      : p
                                  )
                                );
                              }}
                              onRefresh={async () => {
                                try {
                                  const data = await authedFetch("/api/payroll");
                                  setPayrolls(Array.isArray(data) ? data : []);
                                } catch (error) {
                                  toast.error((error as Error).message);
                                }
                              }}
                              onEdit={(payroll) => {
                                setEditingPayrollId(payroll.id);
                                setEditPayrollEmployeeId(payroll.employeeId);
                                setEditPayrollPeriod(payroll.period);
                                setEditPayrollBaseSalary(payroll.baseSalary.toString());
                                setEditPayrollAllowances(payroll.allowances.toString());
                                setEditPayrollDeductions(payroll.deductions.toString());
                                setEditPayrollNotes(payroll.notes || "");
                                setShowEditPayrollModal(true);
                              }}
                              onDelete={async (id) => {
                                try {
                                  await authedFetch(`/api/payroll?id=${encodeURIComponent(id)}`, {
                                    method: "DELETE",
                                  });
                                  setPayrolls((prev) => prev.filter((p) => p.id !== id));
                                  toast.success("Payroll deleted successfully");
                                  try {
                                    const data = await authedFetch("/api/payroll");
                                    setPayrolls(Array.isArray(data) ? data : []);
                                  } catch {
                                    // Ignore refresh errors
                                  }
                                } catch (error) {
                                  toast.error((error as Error).message || "Failed to delete payroll");
                                }
                              }}
                              showEmployeeColumn
                            />
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Edit Payroll Modal */}
                    {showEditPayrollModal && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Edit Payroll</h3>
                            <button
                              type="button"
                              onClick={() => {
                                setShowEditPayrollModal(false);
                                setEditingPayrollId(null);
                                setEditPayrollEmployeeId("");
                                setEditPayrollPeriod("");
                                setEditPayrollBaseSalary("");
                                setEditPayrollAllowances("");
                                setEditPayrollDeductions("");
                                setEditPayrollNotes("");
                              }}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                              aria-label="Close"
                            >
                              ✕
                            </button>
                          </div>
                          <form
                            className="p-6 space-y-4"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!editingPayrollId) return;

                              const baseSalaryNum = parseFloat(editPayrollBaseSalary) || 0;
                              const allowancesNum = parseFloat(editPayrollAllowances) || 0;
                              const deductionsNum = parseFloat(editPayrollDeductions) || 0;

                              if (baseSalaryNum <= 0) {
                                toast.error("Base salary must be greater than 0");
                                return;
                              }

                              const grossPay = baseSalaryNum + allowancesNum;
                              const netPay = grossPay - deductionsNum;

                              if (netPay < 0) {
                                toast.error("Net pay cannot be negative");
                                return;
                              }

                              setSubmittingPayrollEdit(true);
                              try {
                                const updated = await authedFetch("/api/payroll", {
                                  method: "PUT",
                                  body: JSON.stringify({
                                    id: editingPayrollId,
                                    baseSalary: baseSalaryNum,
                                    allowances: allowancesNum,
                                    deductions: deductionsNum,
                                    notes: editPayrollNotes.trim() || undefined,
                                  }),
                                });
                                setPayrolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                                toast.success("Payroll updated successfully");
                                setShowEditPayrollModal(false);
                                setEditingPayrollId(null);
                                setEditPayrollEmployeeId("");
                                setEditPayrollPeriod("");
                                setEditPayrollBaseSalary("");
                                setEditPayrollAllowances("");
                                setEditPayrollDeductions("");
                                setEditPayrollNotes("");
                              } catch (error) {
                                toast.error((error as Error).message || "Failed to update payroll");
                              } finally {
                                setSubmittingPayrollEdit(false);
                              }
                            }}
                          >
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Employee</label>
                              <input
                                type="text"
                                value={employees.find((e) => e.id === editPayrollEmployeeId)?.name || ""}
                                disabled
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Period</label>
                              <input
                                type="text"
                                value={editPayrollPeriod}
                                disabled
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Base Salary <span className="text-rose-500">*</span></label>
                              <input
                                type="number"
                                value={editPayrollBaseSalary}
                                onChange={(e) => setEditPayrollBaseSalary(e.target.value)}
                                min="0"
                                step="0.01"
                                required
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Allowances</label>
                              <input
                                type="number"
                                value={editPayrollAllowances}
                                onChange={(e) => setEditPayrollAllowances(e.target.value)}
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Deductions</label>
                              <input
                                type="number"
                                value={editPayrollDeductions}
                                onChange={(e) => setEditPayrollDeductions(e.target.value)}
                                min="0"
                                step="0.01"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 space-y-1 border border-blue-200">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700">Gross Pay:</span>
                                <span className="font-semibold text-slate-900">
                                  {((parseFloat(editPayrollBaseSalary) || 0) + (parseFloat(editPayrollAllowances) || 0)).toFixed(2)} AED
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700">Net Pay:</span>
                                <span className="font-bold text-blue-600">
                                  {((parseFloat(editPayrollBaseSalary) || 0) + (parseFloat(editPayrollAllowances) || 0) - (parseFloat(editPayrollDeductions) || 0)).toFixed(2)} AED
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-700">Notes (Optional)</label>
                              <textarea
                                value={editPayrollNotes}
                                onChange={(e) => setEditPayrollNotes(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                placeholder="Add any notes..."
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowEditPayrollModal(false);
                                  setEditingPayrollId(null);
                                  setEditPayrollEmployeeId("");
                                  setEditPayrollPeriod("");
                                  setEditPayrollBaseSalary("");
                                  setEditPayrollAllowances("");
                                  setEditPayrollDeductions("");
                                  setEditPayrollNotes("");
                                }}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
                                disabled={submittingPayrollEdit}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={submittingPayrollEdit}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-semibold disabled:opacity-70"
                              >
                                {submittingPayrollEdit ? "Updating..." : "Update Payroll"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    <Card title="Employee Leave Requests" accent="bg-emerald-500">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-700">
                            Review pending leave requests for employees in this business unit.
                          </p>
                          <button
                            type="button"
                            onClick={loadAllLeaves}
                            className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                          >
                            Refresh
                          </button>
                        </div>
                        {loadingLeaves && (
                          <p className="text-xs text-slate-500">Loading leave requests…</p>
                        )}
                        {Object.keys(employeeLeaves).length === 0 && !loadingLeaves ? (
                          <p className="text-sm text-slate-500">
                            No leave requests found yet for this business unit.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {employees.map((e) => {
                              const leaves = employeeLeaves[e.id] || [];
                              if (leaves.length === 0) return null;
                              const pendingCount = leaves.filter((l) => l.status === "Pending").length;
                              return (
                                <div
                                  key={e.id}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-800">{e.name}</p>
                                    {pendingCount > 0 && (
                                      <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px]">
                                        {pendingCount} pending
                                      </span>
                                    )}
                                  </div>
                                  <ul className="space-y-1">
                                    {leaves.slice(0, 4).map((l) => (
                                      <li
                                        key={l.id}
                                        className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1 cursor-pointer hover:bg-slate-100 transition"
                                        onClick={() => openLeaveDetails(l)}
                                      >
                                        <div className="space-y-0.5">
                                          <p className="font-medium">
                                            {l.type} • {l.unit}
                                          </p>
                                          <p className="text-[11px] text-slate-600">
                                            {l.startDate}
                                            {l.endDate && l.endDate !== l.startDate && ` → ${l.endDate}`}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                                              l.status === "Approved"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : l.status === "Rejected"
                                                ? "bg-rose-100 text-rose-700"
                                                : l.status === "Cancelled"
                                                ? "bg-slate-100 text-slate-700"
                                                : "bg-amber-100 text-amber-700"
                                            }`}
                                          >
                                            {l.status}
                                          </span>
                                          {l.status === "Pending" && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setLeaveDecisionModal({ leave: l, action: "approve" })
                                                }
                                                className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] hover:bg-emerald-500"
                                              >
                                                Approve
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setLeaveDecisionModal({ leave: l, action: "reject" })
                                                }
                                                className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] hover:bg-rose-500"
                                              >
                                                Reject
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card title="Overtime Requests" accent="bg-blue-500" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-700">
                            Review and manage employee overtime requests.
                          </p>
                          <button
                            type="button"
                            onClick={loadAllOvertimes}
                            className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                          >
                            Refresh
                          </button>
                        </div>
                        {loadingOvertimes && (
                          <p className="text-xs text-slate-500">Loading overtime requests…</p>
                        )}
                        {Object.keys(employeeOvertimes).length === 0 && !loadingOvertimes ? (
                          <p className="text-sm text-slate-500">
                            No overtime requests found yet for this business unit.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {employees.map((e) => {
                              const overtimes = employeeOvertimes[e.id] || [];
                              if (overtimes.length === 0) return null;
                              const pendingCount = overtimes.filter((o) => o.status === "Pending").length;
                              return (
                                <div
                                  key={e.id}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-800">{e.name}</p>
                                    {pendingCount > 0 && (
                                      <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px]">
                                        {pendingCount} pending
                                      </span>
                                    )}
                                  </div>
                                  <ul className="space-y-1">
                                    {overtimes.slice(0, 4).map((o) => {
                                      const statusClasses =
                                        o.status === "Approved"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : o.status === "Rejected"
                                          ? "bg-rose-100 text-rose-700"
                                          : o.status === "Cancelled"
                                          ? "bg-slate-100 text-slate-700"
                                          : "bg-amber-100 text-amber-700";
                                      return (
                                        <li
                                          key={o.id}
                                          className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1 cursor-pointer hover:bg-slate-100 transition"
                                          onClick={() => setSelectedOvertimeForDetails(o)}
                                        >
                                          <div className="space-y-0.5">
                                            <p className="font-medium">
                                              {o.date} • {o.hours.toFixed(2)} hours
                                            </p>
                                            <p className="text-[11px] text-slate-600">
                                              {o.startTime} - {o.endTime}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span
                                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${statusClasses}`}
                                            >
                                              {o.status}
                                            </span>
                                            {o.status === "Pending" && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOvertimeDecisionModal({ overtime: o, action: "approve" });
                                                    setOvertimeDecisionReason("");
                                                  }}
                                                  className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] hover:bg-emerald-500"
                                                >
                                                  Approve
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOvertimeDecisionModal({ overtime: o, action: "reject" });
                                                    setOvertimeDecisionReason("");
                                                  }}
                                                  className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] hover:bg-rose-500"
                                                >
                                                  Reject
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card title="Advance Salary Requests" accent="bg-indigo-500" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-700">
                            Review pending advance salary requests from employees.
                          </p>
                          <button
                            type="button"
                            onClick={loadAdvanceSalaryRequests}
                            className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                          >
                            Refresh
                          </button>
                        </div>
                        {loadingAdvances && (
                          <p className="text-xs text-slate-500">Loading advance salary requests…</p>
                        )}
                        {advanceSalaryRequests.length === 0 && !loadingAdvances ? (
                          <p className="text-sm text-slate-500">
                            No advance salary requests found yet.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {advanceSalaryRequests
                              .filter((a) => a.status === "Pending")
                              .map((advance) => (
                                <div
                                  key={advance.id}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-800">{advance.employeeName}</p>
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[11px]">
                                      {advance.amount.toFixed(2)} AED
                                    </span>
                                  </div>
                                  <p className="text-slate-600 line-clamp-2">{advance.reason}</p>
                                  <p className="text-slate-500">Requested: {advance.requestedDate}</p>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      onClick={async () => {
                                        try {
                                          const updated = await authedFetch("/api/admin/advance-salary", {
                                            method: "POST",
                                            body: JSON.stringify({ id: advance.id, action: "approve" }),
                                          });
                                          setAdvanceSalaryRequests((prev) =>
                                            prev.map((a) => (a.id === updated.id ? updated : a))
                                          );
                                          toast.success("Advance salary request approved");
                                          // Refresh notifications
                                          const notifications = await authedFetch("/api/notifications?limit=50");
                                          setAssetNotifications(Array.isArray(notifications) ? notifications : []);
                                        } catch (error) {
                                          toast.error((error as Error).message);
                                        }
                                      }}
                                      className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] hover:bg-emerald-500"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const reason = prompt("Enter rejection reason:");
                                        if (!reason || !reason.trim()) return;
                                        try {
                                          const updated = await authedFetch("/api/admin/advance-salary", {
                                            method: "POST",
                                            body: JSON.stringify({ id: advance.id, action: "reject", rejectionReason: reason.trim() }),
                                          });
                                          setAdvanceSalaryRequests((prev) =>
                                            prev.map((a) => (a.id === updated.id ? updated : a))
                                          );
                                          toast.success("Advance salary request rejected");
                                          // Refresh notifications
                                          const notifications = await authedFetch("/api/notifications?limit=50");
                                          setAssetNotifications(Array.isArray(notifications) ? notifications : []);
                                        } catch (error) {
                                          toast.error((error as Error).message);
                                        }
                                      }}
                                      className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] hover:bg-rose-500"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              ))}
                            {advanceSalaryRequests.filter((a) => a.status === "Pending").length === 0 && (
                              <p className="text-sm text-slate-500">No pending advance salary requests.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === "assign-work" && (
                  <>
                    <Card title="Assignment Flow" accent="bg-purple-500">
                      <form
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAssignWorkOrder(new FormData(e.currentTarget));
                          e.currentTarget.reset();
                        }}
                      >
                        <div className="md:col-span-2 lg:col-span-2">
                          <AutocompleteInput
                            label="Customer"
                            required
                            placeholder="Search customer..."
                            suggestions={customers.map((c) => c.name)}
                            value={assignCustomerName}
                            onChange={(val) => {
                              setAssignCustomerName(val);
                              const match = customers.find(
                                (c) => c.name.toLowerCase() === val.toLowerCase()
                              );
                              setAssignCustomerId(match ? match.id : null);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Quotation/Reference Number</label>
                          <input
                            name="quotationReferenceNumber"
                            placeholder="Quotation/Reference Number (optional)"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Customer phone</label>
                          <input
                            name="customerPhone"
                            placeholder="+971..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Order date &amp; time</label>
                          <input
                            name="orderDateTime"
                            type="datetime-local"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Service type</label>
                          <select
                            name="serviceTypeId"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            defaultValue=""
                          >
                            <option value="">Service type (optional)</option>
                            {serviceTypes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Assign employee</label>
                          <select
                            name="assignedEmployeeId"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            defaultValue=""
                          >
                            <option value="">Assign employee (optional)</option>
                            {employees
                              .map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.name} • {e.role} ({e.status})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Location address</label>
                          <input
                            name="locationAddress"
                            placeholder="Location address"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                          />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3 space-y-2">
                          <label className="text-sm font-medium text-slate-700">Work description</label>
                          <input
                            name="workDescription"
                            placeholder="Describe the work to be done"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Payment Method</label>
                          <select
                            name="paymentMethod"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            defaultValue=""
                          >
                            <option value="">Payment Method (optional)</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank transfer">Bank transfer</option>
                            <option value="POS Sale">POS Sale</option>
                          </select>
                        </div>
                        <button className="md:col-span-2 lg:col-span-3 bg-indigo-600 text-white rounded-lg py-3 hover:bg-indigo-500">
                          Create / Assign
                        </button>
                      </form>
                    </Card>

                    <Card title="Scheduled Work" accent="bg-sky-500" className="mt-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-2 pr-3">Customer</th>
                            <th className="py-2 pr-3">Service</th>
                            <th className="py-2 pr-3">Assigned</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 pr-3">Updated</th>
                            <th className="py-2 pr-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {workOrders.map((w) => {
                            const employee = employees.find((e) => e.id === w.assignedEmployeeId);
                            const customer = customers.find((c) => c.id === w.customerId);
                            const service = serviceTypes.find((s) => s.id === w.serviceTypeId);
                            const isEditing = editingWorkOrderId === w.id;
                            return (
                              <Fragment key={w.id}>
                                <tr>
                                  <td className="py-2 pr-3">{customer?.name ?? "—"}</td>
                                  <td className="py-2 pr-3">{service?.name ?? "—"}</td>
                                  <td className="py-2 pr-3">
                                    {employee ? `${employee.name} (${employee.role})` : "Unassigned"}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs">
                                      {w.status}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-3 text-slate-500">
                                    {new Date(w.audit.updatedAt).toLocaleString()}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => startEditWorkOrder(w)}
                                        className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1"
                                        title="Edit"
                                      >
                                        <MdModeEdit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteWorkOrder(w.id)}
                                        className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1"
                                        title="Delete"
                                      >
                                        <MdDelete className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {isEditing && (
                                  <tr>
                                    <td colSpan={6} className="py-4">
                                      <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold text-slate-900 mb-3">Edit Work Order</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          <div className="md:col-span-2 lg:col-span-2">
                                            <AutocompleteInput
                                              label="Customer"
                                              required
                                              placeholder="Search customer..."
                                              suggestions={customers.map((c) => c.name)}
                                              value={editWorkOrderCustomerName}
                                              onChange={(val) => {
                                                setEditWorkOrderCustomerName(val);
                                                const match = customers.find(
                                                  (c) => c.name.toLowerCase() === val.toLowerCase()
                                                );
                                                setEditWorkOrderCustomerId(match ? match.id : "");
                                              }}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Location address</label>
                                            <input
                                              value={editWorkOrderLocationAddress}
                                              onChange={(e) => setEditWorkOrderLocationAddress(e.target.value)}
                                              placeholder="Location address"
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                              required
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Customer phone</label>
                                            <input
                                              value={editWorkOrderCustomerPhone}
                                              onChange={(e) => setEditWorkOrderCustomerPhone(e.target.value)}
                                              placeholder="+971..."
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                              required
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Order date &amp; time</label>
                                            <input
                                              type="datetime-local"
                                              value={editWorkOrderDateTime}
                                              onChange={(e) => setEditWorkOrderDateTime(e.target.value)}
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                              required
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Service type</label>
                                            <select
                                              value={editWorkOrderServiceTypeId}
                                              onChange={(e) => setEditWorkOrderServiceTypeId(e.target.value)}
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                            >
                                              <option value="">Service type (optional)</option>
                                              {serviceTypes.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                  {s.name}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Assign employee</label>
                                            <select
                                              value={editWorkOrderAssignedEmployeeId}
                                              onChange={(e) => setEditWorkOrderAssignedEmployeeId(e.target.value)}
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                            >
                                              <option value="">Assign employee (optional)</option>
                                              {employees
                                                .map((e) => (
                                                  <option key={e.id} value={e.id}>
                                                    {e.name} • {e.role} ({e.status})
                                                  </option>
                                                ))}
                                            </select>
                                          </div>
                                          <div className="md:col-span-2 lg:col-span-3 space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Work description</label>
                                            <input
                                              value={editWorkOrderDescription}
                                              onChange={(e) => setEditWorkOrderDescription(e.target.value)}
                                              placeholder="Describe the work to be done"
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                              required
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Quotation/Reference Number</label>
                                            <input
                                              value={editWorkOrderQuotationReferenceNumber}
                                              onChange={(e) => setEditWorkOrderQuotationReferenceNumber(e.target.value)}
                                              placeholder="Quotation/Reference Number (optional)"
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Payment Method</label>
                                            <select
                                              value={editWorkOrderPaymentMethod}
                                              onChange={(e) => setEditWorkOrderPaymentMethod(e.target.value)}
                                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                            >
                                              <option value="">Payment Method (optional)</option>
                                              <option value="Cash">Cash</option>
                                              <option value="Bank transfer">Bank transfer</option>
                                              <option value="POS Sale">POS Sale</option>
                                            </select>
                                          </div>
                                          <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                                            <button
                                              onClick={handleUpdateWorkOrder}
                                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => setEditingWorkOrderId(null)}
                                              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                      {workOrders.length === 0 && (
                        <p className="text-sm text-slate-500 mt-3">No work orders yet.</p>
                      )}
                    </div>
                  </Card>
                  </>
                )}

                {activeTab === "job-logs" && (
                  <JobLogs
                    workOrders={workOrders}
                    employees={employees}
                    onStatusChange={async (orderId, newStatus) => {
                      try {
                        const res = await authedFetch("/api/work-orders", {
                          method: "PUT",
                          body: JSON.stringify({ id: orderId, status: newStatus }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "Failed to update work order status");
                        }
                        // Refresh work orders after status change
                        const refreshRes = await authedFetch("/api/work-orders");
                        if (refreshRes.ok) {
                          const data = await refreshRes.json();
                          setWorkOrders(Array.isArray(data) ? data : data.data || []);
                        }
                        toast.success("Work order status updated!");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to update status");
                      }
                    }}
                    onViewDetails={(order) => {
                      // Show work order details - you can implement a modal here
                      toast.success(`Viewing: ${order.customerName} - ${order.workDescription.substring(0, 50)}...`);
                    }}
                  />
                )}

                {activeTab === "tickets" && (
                  <Card title="Tickets" accent="bg-rose-500">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-2 pr-3">Subject</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 pr-3">Priority</th>
                            <th className="py-2 pr-3">Assigned</th>
                            <th className="py-2 pr-3">Updated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tickets.map((t) => {
                            const assigned = employees.find((e) => e.id === t.assignedEmployeeId);
                            return (
                              <tr key={t.id}>
                                <td className="py-2 pr-3 max-w-xs">
                                  <p className="font-medium text-slate-900 truncate">{t.subject}</p>
                                  {t.category && (
                                    <p className="text-[11px] text-slate-500">Category: {t.category}</p>
                                  )}
                                </td>
                                <td className="py-2 pr-3">
                                  <select
                                    value={t.status}
                                    onChange={(e) =>
                                      handleUpdateTicketStatus(t.id, e.target.value as TicketStatus)
                                    }
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                                  >
                                    {(["New", "In Progress", "On Hold", "Resolved", "Closed"] as TicketStatus[]).map(
                                      (status) => (
                                        <option key={status} value={status}>
                                          {status}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </td>
                                <td className="py-2 pr-3">
                                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs">
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-slate-700">
                                  {assigned ? `${assigned.name} (${assigned.role})` : "Unassigned"}
                                </td>
                                <td className="py-2 pr-3 text-slate-500">
                                  {new Date(t.updatedAt).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                          {tickets.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-3 text-sm text-slate-500">
                                No tickets yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {activeTab === "employee-ratings" && (
                  <Card title="Employee Ratings" accent="bg-amber-500">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-slate-600">
                        Overview of average customer ratings per employee for this business unit.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-2 pr-3">Employee</th>
                            <th className="py-2 pr-3">Role</th>
                            <th className="py-2 pr-3">Average Rating</th>
                            <th className="py-2 pr-3">Total Ratings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {employeeRatingSummary.map((r) => (
                            <tr key={r.employeeId}>
                              <td className="py-2 pr-3 text-slate-900">{r.employeeName}</td>
                              <td className="py-2 pr-3 text-slate-700">{r.role}</td>
                              <td className="py-2 pr-3">
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <FaFaceGrinStars className="w-4 h-4" />
                                  <span className="font-semibold">
                                    {typeof r.averageScore === "number"
                                      ? r.averageScore.toFixed(1)
                                      : "—"}
                                  </span>
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-slate-700">{r.count}</td>
                            </tr>
                          ))}
                          {employeeRatingSummary.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-3 text-sm text-slate-500">
                                No employee ratings available yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {activeTab === "daily-schedule" && (
                  <div className="space-y-4">
                    <Card
                      title={`Schedules for ${scheduleDate || "selected date"}`}
                      accent="bg-blue-500"
                      action={
                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              filterActive
                                ? loadDailySchedules({
                                    from: filterFromDate || undefined,
                                    to: filterToDate || undefined,
                                  })
                                : loadDailySchedules({ date: scheduleDate })
                            }
                            className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                            disabled={loadingSchedules}
                          >
                            {loadingSchedules ? "Refreshing..." : "Refresh"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingScheduleId(null);
                              setScheduleTasksText("");
                              setScheduleEmployeeIds([]);
                              setScheduleEmployeeNames([]);
                              setScheduleEmployeeNamesInput("");
                              setShowScheduleModal(true);
                            }}
                            className="px-3 py-1 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-500 flex items-center gap-1"
                          >
                            <IoMdAddCircle className="w-4 h-4" />
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={handleShareSchedules}
                            className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 flex items-center gap-1"
                          >
                            <BsFillSendFill className="w-3.5 h-3.5" />
                            Share
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowFilterPanel((v) => !v)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs ${
                              filterActive
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <IoFilter className="w-3.5 h-3.5" />
                            Filter
                          </button>
                        </div>
                      }
                    >
                      {showFilterPanel && (
                        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 flex flex-wrap items-end gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-600">
                              From date
                            </label>
                            <input
                              type="date"
                              value={filterFromDate}
                              onChange={(e) => setFilterFromDate(e.target.value)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-600">
                              To date
                            </label>
                            <input
                              type="date"
                              value={filterToDate}
                              onChange={(e) => setFilterToDate(e.target.value)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white"
                            />
                          </div>
                          <div className="flex gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                if (!filterFromDate && !filterToDate) {
                                  toast.error("Select at least one date to filter");
                                  return;
                                }
                                loadDailySchedules({
                                  from: filterFromDate || undefined,
                                  to: filterToDate || undefined,
                                });
                                setShowFilterPanel(false);
                              }}
                              className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs hover:bg-indigo-500"
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFilterFromDate("");
                                setFilterToDate("");
                                setShowFilterPanel(false);
                                loadDailySchedules({ date: scheduleDate });
                              }}
                              className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200 hover:bg-white"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                      {loadingSchedules ? (
                        <p className="text-sm text-slate-600">Loading schedules...</p>
                      ) : currentScheduleEntries.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {filterActive
                            ? "No schedules for the selected range."
                            : "No schedules for this date yet."}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {currentScheduleEntries.map((entry) => {
                            const names =
                              Array.isArray(entry.employeeNames) && entry.employeeNames.length > 0
                                ? entry.employeeNames.join(" & ")
                                : ((entry as any).employeeName as string | undefined) ??
                                  (Array.isArray(entry.employeeIds) ? entry.employeeIds.join(", ") : "—");

                            const entryEmployeeIds = Array.isArray(entry.employeeIds) ? entry.employeeIds : [];
                            const matchingWorkOrders = workOrders
                              .filter((w) => w.status !== "Submitted")
                              .filter((w) => (entryEmployeeIds.length === 0 ? false : entryEmployeeIds.includes(w.assignedEmployeeId || "")))
                              .filter((w) => {
                                const date = new Date(w.orderDateTime);
                                const iso = date.toISOString().slice(0, 10);
                                return iso === entry.date;
                              })
                              .map((w) => {
                                const name = w.customerName ?? "Work order";
                                const loc = w.locationAddress ? ` (${w.locationAddress})` : "";
                                return `${name}${loc}`;
                              });

                            const combinedTasks = [...entry.tasks.map((t) => t.text), ...matchingWorkOrders];

                            return (
                              <div
                                key={entry.id}
                                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-900">
                                      {names}
                                    </p>
                                    {entry.employeeIds?.length > 0 && (
                                      <p className="text-xs text-slate-500">
                                        IDs: {entry.employeeIds.join(", ")}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                                    {entry.date}
                                  </span>
                                  <div className="flex items-center gap-2 ml-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditDailySchedule(entry)}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                                      title="Edit schedule"
                                    >
                                      <MdModeEdit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDailySchedule(entry.id)}
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-50"
                                      title="Delete schedule"
                                    >
                                      <MdDelete className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
                                  {combinedTasks.map((task, idx) => (
                                    <li key={idx}>{task}</li>
                                  ))}
                                </ol>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>
                )}

              </div>
            </div>
          </section>
        )}

      </div>

      {/* Mobile bottom navigation */}
      {adminAuth && (
        <>
          <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden">
            <div className="mx-auto max-w-3xl px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="rounded-3xl bg-white/90 backdrop-blur-lg shadow-2xl border border-white/40 flex items-center justify-between px-3 py-2">
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className={`flex flex-col items-center gap-1 flex-1 text-xs font-medium text-slate-600 hover:${theme.text} transition`}
                >
                  <span className="w-10 h-10 rounded-2xl grid place-items-center border border-slate-200 bg-white">
                    <RiMenu5Fill className={`w-5 h-5 ${theme.text}`} />
                  </span>
                  Menu
                </button>
                <button
                  onClick={scrollToDashboard}
                  className={`flex flex-col items-center gap-1 flex-1 text-xs font-medium ${theme.text}`}
                >
                  <span className={`w-10 h-10 rounded-2xl grid place-items-center border ${theme.border} ${theme.bg}`}>
                    <BiSolidHomeSmile className={`w-5 h-5 ${theme.text}`} />
                  </span>
                  Home
                </button>
                {(adminAuth.role === "admin" || adminAuth.featureAccess?.includes("advertisements")) && (
                  <button
                    onClick={() => setShowAdvertisementModal(true)}
                    className={`flex flex-col items-center gap-1 flex-1 text-xs font-medium ${theme.text}`}
                  >
                    <span className={`w-10 h-10 rounded-2xl grid place-items-center border ${theme.border} ${theme.bg}`}>
                      <RiAdvertisementFill className={`w-5 h-5 ${theme.text}`} />
                    </span>
                    Advertisement
                  </button>
                )}
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`flex flex-col items-center gap-1 w-full text-xs font-medium ${theme.text}`}
                  >
                    <span className={`w-10 h-10 rounded-2xl grid place-items-center border ${theme.border} ${theme.bg} relative`}>
                      <IoNotifications className={`w-5 h-5 ${theme.text}`} />
                      {totalNotificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-semibold flex items-center justify-center text-white border border-white shadow-sm">
                          {totalNotificationCount > 9 ? "9+" : totalNotificationCount}
                        </span>
                      )}
                    </span>
                    Notifications
                  </button>
                </div>
                <button
                  onClick={() => setShowAdminProfile(true)}
                  className={`flex flex-col items-center gap-1 flex-1 text-xs font-medium ${theme.text}`}
                >
                  <span className={`w-10 h-10 rounded-2xl grid place-items-center border ${theme.border} ${theme.bg}`}>
                    <FaUserShield className={`w-5 h-5 ${theme.text}`} />
                  </span>
                  Profile
                </button>
              </div>
            </div>
          </nav>

          {/* Mobile menu modal */}
          {showMobileMenu && (
            <div
              className="fixed inset-0 z-40 md:hidden flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3"
              onClick={() => setShowMobileMenu(false)}
            >
              <div
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">Choose section</p>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setShowMobileMenu(false);
                        scrollToTop();
                      }}
                      className={`w-full text-left px-4 py-4 flex items-center justify-between text-sm font-medium ${
                        activeTab === tab.id ? "bg-indigo-50 text-indigo-700" : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 text-slate-600">
                          {tab.icon}
                        </span>
                        <span>{tab.label}</span>
                      </span>
                      {activeTab === tab.id && <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Active</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications modal */}
          {showNotifications && adminAuth && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setShowNotifications(false)}
            >
              <div
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center">
                      <IoNotifications className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Notifications</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {totalNotificationCount > 0 ? `${totalNotificationCount} notification${totalNotificationCount > 1 ? 's' : ''}` : 'No notifications'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center hover:bg-slate-200"
                    aria-label="Close notifications"
                  >
                    ✕
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-4">
                  {assetNotifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      No notifications
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assetNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 hover:bg-slate-50 transition cursor-pointer rounded-lg border border-slate-100"
                          onClick={async () => {
                            if (notification.type === "ticket") {
                              // Mark notification as read
                              try {
                                await authedFetch("/api/admin/ticket-notification", {
                                  method: "POST",
                                  body: JSON.stringify({ id: notification.id, action: "read" }),
                                });
                              } catch {
                                // Ignore errors
                              }
                              // Navigate to tickets tab
                              setActiveTab("tickets");
                              setShowNotifications(false);
                              // Refresh notifications
                              try {
                                const notifications = await authedFetch("/api/notifications?limit=50");
                                setAssetNotifications(Array.isArray(notifications) ? notifications : []);
                              } catch {
                                // Ignore errors
                              }
                            } else if (notification.type === "work_order") {
                              // Mark notification as read
                              try {
                                await authedFetch("/api/admin/work-order-notification", {
                                  method: "POST",
                                  body: JSON.stringify({ id: notification.id, action: "read" }),
                                });
                              } catch {
                                // Ignore errors
                              }
                              // Navigate to assign-work tab
                              setActiveTab("assign-work");
                              setShowNotifications(false);
                              // Refresh notifications
                              try {
                                const notifications = await authedFetch("/api/notifications?limit=50");
                                setAssetNotifications(Array.isArray(notifications) ? notifications : []);
                              } catch {
                                // Ignore errors
                              }
                              // Scroll to top
                              if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            } else if (notification.type === "leave" || notification.type === "advance_salary") {
                              // Navigate to payroll tab for leave requests and advance salary requests
                              setActiveTab("payroll");
                              setShowNotifications(false);
                              // Load leaves if not already loaded
                              if (Object.keys(employeeLeaves).length === 0) {
                                loadAllLeaves();
                              }
                              // Load advance salary requests if not already loaded
                              if (advanceSalaryRequests.length === 0) {
                                loadAdvanceSalaryRequests();
                              }
                              // Scroll to top to show the requests section
                              if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            } else if (notification.type === "asset_approaching" || notification.type === "asset") {
                              // Navigate to assets tab and open the relevant category
                              setActiveTab("assets");
                              setShowAssetsModal(true);
                              setActiveAssetsCategory(notification.categoryKey as any);
                              setShowNotifications(false);
                            } else {
                              setShowAssetsModal(true);
                              setActiveAssetsCategory(notification.categoryKey as any);
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notification.type === "ticket" ? "bg-purple-500" :
                              notification.type === "leave" ? "bg-blue-500" :
                              notification.type === "advance_salary" ? "bg-indigo-500" :
                              notification.type === "work_order" ? "bg-green-500" :
                              notification.type === "asset_approaching" ? "bg-red-500" :
                              "bg-amber-500"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                {notification.type === "ticket"
                                  ? `New Ticket: ${notification.subject || "Untitled"}`
                                  : notification.type === "leave"
                                  ? `${notification.employeeName} - ${notification.leaveType} Leave Request`
                                  : notification.type === "advance_salary"
                                  ? `${notification.employeeName} - Advance Salary Request (${notification.amount?.toFixed(2) || "0.00"} AED)`
                                  : notification.type === "work_order"
                                  ? `Work Order Submitted: ${notification.customerName || "Customer"} - ${notification.workDescription?.substring(0, 30) || "Work order"}...`
                                  : notification.type === "asset_approaching"
                                  ? `⚠️ ${notification.dateType} Approaching`
                                  : `${notification.categoryKey.replace(/_/g, " ")} - ${notification.dateType}`}
                              </p>
                             <p className="text-xs text-slate-500 mt-1">
                               {notification.type === "ticket" && notification.customerName
                                 ? `${notification.customerName} • `
                                 : ""}
                               {notification.type === "ticket" && notification.priority
                                 ? `Priority: ${notification.priority} • `
                                 : ""}
                               {notification.type === "work_order" && notification.employeeName
                                 ? `${notification.employeeName} • `
                                 : ""}
                               {notification.type === "work_order" && notification.locationAddress
                                 ? `${notification.locationAddress} • `
                                 : ""}
                               {notification.type === "asset_approaching" && notification.daysUntil !== undefined
                                 ? notification.isOverdue
                                   ? `Overdue by ${Math.abs(notification.daysUntil)} day(s) • `
                                   : `${notification.daysUntil} day(s) remaining • `
                                 : ""}
                               {notification.type === "asset_approaching"
                                 ? new Date(notification.dateValue).toLocaleDateString()
                                 : new Date(notification.sentAt).toLocaleString()}
                             </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notification sending modal */}
          {showNotificationModal && adminAuth && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => {
                setShowNotificationModal(false);
                setNotificationTitle("");
                setNotificationMessage("");
                setNotificationRecipientType("employee");
                setNotificationSelectedEmployeeIds([]);
                setNotificationSelectedCustomerIds([]);
                setNotificationSendToAllEmployees(false);
                setNotificationSendToAllCustomers(false);
                setNotificationEmployeeSearch("");
                setNotificationCustomerSearch("");
              }}
            >
              <div
                className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center">
                      <AiFillNotification className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Send Notification</p>
                      <p className="text-sm font-semibold text-slate-900">Create and send notification</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowNotificationModal(false);
                      setNotificationTitle("");
                      setNotificationMessage("");
                      setNotificationRecipientType("employee");
                      setNotificationSelectedEmployeeIds([]);
                      setNotificationSelectedCustomerIds([]);
                      setNotificationSendToAllEmployees(false);
                      setNotificationSendToAllCustomers(false);
                      setNotificationEmployeeSearch("");
                      setNotificationCustomerSearch("");
                    }}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center hover:bg-slate-200"
                    aria-label="Close notification modal"
                  >
                    ✕
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-5">
                  {/* Recipient Type Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Recipient Type</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationRecipientType("employee");
                          setNotificationSelectedCustomerIds([]);
                          setNotificationSendToAllCustomers(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          notificationRecipientType === "employee"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Employees
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationRecipientType("customer");
                          setNotificationSelectedEmployeeIds([]);
                          setNotificationSendToAllEmployees(false);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          notificationRecipientType === "customer"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Customers
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationRecipientType("both")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          notificationRecipientType === "both"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Both
                      </button>
                    </div>
                  </div>

                  {/* Employee Selection */}
                  {(notificationRecipientType === "employee" || notificationRecipientType === "both") && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Employees</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSendToAllEmployees}
                            onChange={(e) => {
                              setNotificationSendToAllEmployees(e.target.checked);
                              if (e.target.checked) {
                                setNotificationSelectedEmployeeIds([]);
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-600">Send to all employees</span>
                        </label>
                      </div>
                      {!notificationSendToAllEmployees && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Search employees..."
                            value={notificationEmployeeSearch}
                            onChange={(e) => setNotificationEmployeeSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                            {employees
                              .filter((emp) =>
                                emp.name.toLowerCase().includes(notificationEmployeeSearch.toLowerCase())
                              )
                              .map((emp) => (
                                <label
                                  key={emp.id}
                                  className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={notificationSelectedEmployeeIds.includes(emp.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNotificationSelectedEmployeeIds([...notificationSelectedEmployeeIds, emp.id]);
                                      } else {
                                        setNotificationSelectedEmployeeIds(
                                          notificationSelectedEmployeeIds.filter((id) => id !== emp.id)
                                        );
                                      }
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                                  />
                                  <span className="text-sm text-slate-700">
                                    {emp.name} {emp.role ? `(${emp.role})` : ""}
                                  </span>
                                </label>
                              ))}
                          </div>
                          {notificationSelectedEmployeeIds.length > 0 && (
                            <p className="text-xs text-slate-500">
                              {notificationSelectedEmployeeIds.length} employee(s) selected
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Selection */}
                  {(notificationRecipientType === "customer" || notificationRecipientType === "both") && (
                    <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Customers</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSendToAllCustomers}
                            onChange={(e) => {
                              setNotificationSendToAllCustomers(e.target.checked);
                              if (e.target.checked) {
                                setNotificationSelectedCustomerIds([]);
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-600">Send to all customers</span>
                        </label>
                      </div>
                      {!notificationSendToAllCustomers && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Search customers..."
                            value={notificationCustomerSearch}
                            onChange={(e) => setNotificationCustomerSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                            {customerUsers
                              .filter((cu) =>
                                cu.username.toLowerCase().includes(notificationCustomerSearch.toLowerCase()) ||
                                cu.email.toLowerCase().includes(notificationCustomerSearch.toLowerCase()) ||
                                (cu.companyName && cu.companyName.toLowerCase().includes(notificationCustomerSearch.toLowerCase()))
                              )
                              .map((cu) => (
                                <label
                                  key={cu.id}
                                  className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={notificationSelectedCustomerIds.includes(cu.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNotificationSelectedCustomerIds([...notificationSelectedCustomerIds, cu.id]);
                                      } else {
                                        setNotificationSelectedCustomerIds(
                                          notificationSelectedCustomerIds.filter((id) => id !== cu.id)
                                        );
                                      }
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                                  />
                                  <span className="text-sm text-slate-700">
                                    {cu.companyName || cu.username} ({cu.email})
                                  </span>
                                </label>
                              ))}
                          </div>
                          {notificationSelectedCustomerIds.length > 0 && (
                            <p className="text-xs text-slate-500">
                              {notificationSelectedCustomerIds.length} customer(s) selected
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      placeholder="Enter notification title"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      placeholder="Enter notification message"
                      rows={5}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      required
                    />
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotificationModal(false);
                      setNotificationTitle("");
                      setNotificationMessage("");
                      setNotificationRecipientType("employee");
                      setNotificationSelectedEmployeeIds([]);
                      setNotificationSelectedCustomerIds([]);
                      setNotificationSendToAllEmployees(false);
                      setNotificationSendToAllCustomers(false);
                      setNotificationEmployeeSearch("");
                      setNotificationCustomerSearch("");
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    disabled={submittingNotification}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!notificationTitle.trim() || !notificationMessage.trim()) {
                        toast.error("Title and message are required");
                        return;
                      }

                      // Validate selections
                      if (notificationRecipientType === "employee" && !notificationSendToAllEmployees && notificationSelectedEmployeeIds.length === 0) {
                        toast.error("Please select at least one employee or select 'Send to all employees'");
                        return;
                      }

                      if (notificationRecipientType === "customer" && !notificationSendToAllCustomers && notificationSelectedCustomerIds.length === 0) {
                        toast.error("Please select at least one customer or select 'Send to all customers'");
                        return;
                      }

                      if (notificationRecipientType === "both") {
                        if (!notificationSendToAllEmployees && notificationSelectedEmployeeIds.length === 0 &&
                            !notificationSendToAllCustomers && notificationSelectedCustomerIds.length === 0) {
                          toast.error("Please select at least one recipient");
                          return;
                        }
                      }

                      setSubmittingNotification(true);
                      try {
                        const payload: any = {
                          title: notificationTitle.trim(),
                          message: notificationMessage.trim(),
                          recipientType: notificationRecipientType,
                        };

                        if (notificationRecipientType === "employee" || notificationRecipientType === "both") {
                          if (!notificationSendToAllEmployees && notificationSelectedEmployeeIds.length > 0) {
                            payload.employeeIds = notificationSelectedEmployeeIds;
                          }
                        }

                        if (notificationRecipientType === "customer" || notificationRecipientType === "both") {
                          if (!notificationSendToAllCustomers && notificationSelectedCustomerIds.length > 0) {
                            payload.customerIds = notificationSelectedCustomerIds;
                          }
                        }

                        const response = await authedFetch("/api/admin/notifications/manual", {
                          method: "POST",
                          body: JSON.stringify(payload),
                        });

                        toast.success(`Notification sent successfully to ${response.count || 0} recipient(s)`);
                        setShowNotificationModal(false);
                        setNotificationTitle("");
                        setNotificationMessage("");
                        setNotificationRecipientType("employee");
                        setNotificationSelectedEmployeeIds([]);
                        setNotificationSelectedCustomerIds([]);
                        setNotificationSendToAllEmployees(false);
                        setNotificationSendToAllCustomers(false);
                        setNotificationEmployeeSearch("");
                        setNotificationCustomerSearch("");
                      } catch (error) {
                        toast.error((error as Error).message || "Failed to send notification");
                      } finally {
                        setSubmittingNotification(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submittingNotification}
                  >
                    {submittingNotification ? "Sending..." : "Send Notification"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Advertisement modal */}
          {showAdvertisementModal && adminAuth && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => {
                setShowAdvertisementModal(false);
                setAdvertisementType("message");
                setAdvertisementImage("");
                setAdvertisementMessage("");
              }}
            >
              <div
                className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center">
                      <RiAdvertisementFill className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Send Advertisement</p>
                      <p className="text-sm font-semibold text-slate-900">Create and send advertisement to all customers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAdvertisementModal(false);
                      setAdvertisementType("message");
                      setAdvertisementImage("");
                      setAdvertisementMessage("");
                    }}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center hover:bg-slate-200"
                    aria-label="Close advertisement modal"
                  >
                    ✕
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 space-y-5">
                  {/* Advertisement Type Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Advertisement Type</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAdvertisementType("image");
                          setAdvertisementMessage("");
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          advertisementType === "image"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdvertisementType("message");
                          setAdvertisementImage("");
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          advertisementType === "message"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Message
                      </button>
                    </div>
                  </div>

                  {/* Image Upload */}
                  {advertisementType === "image" && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Image <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // Check file size (max 10MB)
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error("Image is too large. Maximum size is 10MB.");
                            e.target.value = "";
                            return;
                          }

                          try {
                            const dataUrl = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === "string") {
                                  resolve(reader.result);
                                } else {
                                  reject(new Error("Failed to read file"));
                                }
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });
                            setAdvertisementImage(dataUrl);
                          } catch (error) {
                            toast.error("Failed to read image file");
                            e.target.value = "";
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-700 hover:file:bg-indigo-500/30 file:cursor-pointer cursor-pointer"
                      />
                      {advertisementImage && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-2">Preview:</p>
                          <img
                            src={advertisementImage}
                            alt="Advertisement preview"
                            className="max-w-full max-h-64 rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setAdvertisementImage("");
                              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                              if (fileInput) fileInput.value = "";
                            }}
                            className="mt-2 text-xs text-rose-500 hover:text-rose-600"
                          >
                            Remove image
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Input */}
                  {advertisementType === "message" && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Message <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={advertisementMessage}
                        onChange={(e) => setAdvertisementMessage(e.target.value)}
                        placeholder="Enter advertisement message"
                        rows={8}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        required
                      />
                    </div>
                  )}

                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-xs text-indigo-700">
                      <strong>Note:</strong> This advertisement will be sent to all customers in your business unit and will automatically expire after 48 hours.
                    </p>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvertisementModal(false);
                      setAdvertisementType("message");
                      setAdvertisementImage("");
                      setAdvertisementMessage("");
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    disabled={submittingAdvertisement}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (advertisementType === "image" && !advertisementImage) {
                        toast.error("Please upload an image");
                        return;
                      }

                      if (advertisementType === "message" && !advertisementMessage.trim()) {
                        toast.error("Please enter a message");
                        return;
                      }

                      setSubmittingAdvertisement(true);
                      try {
                        const payload: any = {
                          type: advertisementType,
                        };

                        if (advertisementType === "image") {
                          payload.imageUrl = advertisementImage;
                        } else {
                          payload.message = advertisementMessage.trim();
                        }

                        const response = await authedFetch("/api/admin/advertisements", {
                          method: "POST",
                          body: JSON.stringify(payload),
                        });

                        toast.success("Advertisement sent successfully to all customers");
                        setShowAdvertisementModal(false);
                        setAdvertisementType("message");
                        setAdvertisementImage("");
                        setAdvertisementMessage("");
                      } catch (error) {
                        toast.error((error as Error).message || "Failed to send advertisement");
                      } finally {
                        setSubmittingAdvertisement(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submittingAdvertisement}
                  >
                    {submittingAdvertisement ? "Sending..." : "Send Advertisement"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin profile modal */}
          {showAdminProfile && adminAuth && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setShowAdminProfile(false)}
            >
              <div
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center">
                      <FaUserShield className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Admin Profile</p>
                      <p className="text-sm font-semibold text-slate-900">{adminAuth.email ?? "Admin"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdminProfile(false)}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center"
                    aria-label="Close admin profile"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5 space-y-3 text-sm text-slate-800">
                  <p><span className="font-semibold">Business Unit:</span> {adminAuth.businessUnit}</p>
                  <p><span className="font-semibold">Email:</span> {adminAuth.email ?? "—"}</p>
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={() => {
                      setShowAdminProfile(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Daily Schedule Modal */}
          {showScheduleModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setShowScheduleModal(false)}
            >
              <div
                className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Daily Work Schedule</p>
                    <h3 className="text-lg font-semibold text-slate-900">Add schedule</h3>
                  </div>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center"
                    aria-label="Close schedule modal"
                  >
                    ✕
                  </button>
                </div>
                <form className="p-5 space-y-4" onSubmit={handleSaveDailySchedule}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Additional names (optional)</label>
                      <input
                        value={scheduleEmployeeNamesInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScheduleEmployeeNamesInput(val);
                          setScheduleEmployeeNames(
                            val
                              .split(",")
                              .map((v) => v.trim())
                              .filter((v) => v.length > 0)
                          );
                        }}
                        placeholder="Comma separated names"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      />
                      <p className="text-xs text-slate-500">Useful for temporary or external staff.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Select employees</label>
                      <span className="text-xs text-slate-500">
                        Selected: {scheduleEmployeeIds.length}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                      {employees.map((emp) => {
                        const checked = scheduleEmployeeIds.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-sm cursor-pointer ${
                              checked ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleScheduleEmployee(emp.id)}
                              className="accent-indigo-600"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{emp.name}</p>
                              <p className="text-xs text-slate-500">{emp.role}</p>
                            </div>
                          </label>
                        );
                      })}
                      {employees.length === 0 && (
                        <p className="text-xs text-slate-500 px-2">No employees available.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Tasks (one per line)</label>
                    <textarea
                      value={scheduleTasksText}
                      onChange={(e) => setScheduleTasksText(e.target.value)}
                      rows={5}
                      placeholder="Task 1&#10;Task 2"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowScheduleModal(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      Add schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
      {/* Leave Request Detail Modal */}
      {selectedLeaveForDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedLeaveForDetails(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Leave Request Details</p>
                <p className="text-lg font-semibold text-slate-900">{selectedLeaveForDetails.employeeName}</p>
              </div>
              <button
                onClick={() => setSelectedLeaveForDetails(null)}
                className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center hover:bg-slate-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</p>
                  <p className="text-sm font-medium text-slate-900">{selectedLeaveForDetails.employeeName}</p>
                  <p className="text-xs text-slate-600">
                    {employees.find((e) => e.id === selectedLeaveForDetails.employeeId)?.role || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Business Unit</p>
                  <p className="text-sm font-medium text-slate-900">{selectedLeaveForDetails.businessUnit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</p>
                  <p className="text-sm font-medium text-slate-900">{selectedLeaveForDetails.type}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</p>
                  <p className="text-sm font-medium text-slate-900">{selectedLeaveForDetails.unit}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date Range</p>
                <p className="text-sm font-medium text-slate-900">
                  {selectedLeaveForDetails.startDate}
                  {selectedLeaveForDetails.endDate &&
                    selectedLeaveForDetails.endDate !== selectedLeaveForDetails.startDate &&
                    ` → ${selectedLeaveForDetails.endDate}`}
                </p>
                {selectedLeaveForDetails.startTime && selectedLeaveForDetails.endTime && (
                  <p className="text-xs text-slate-600 mt-1">
                    Time: {selectedLeaveForDetails.startTime} - {selectedLeaveForDetails.endTime}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</p>
                <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{selectedLeaveForDetails.reason}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mt-1 ${
                    selectedLeaveForDetails.status === "Approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedLeaveForDetails.status === "Rejected"
                      ? "bg-rose-100 text-rose-700"
                      : selectedLeaveForDetails.status === "Cancelled"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selectedLeaveForDetails.status}
                </span>
              </div>

              {selectedLeaveForDetails.status === "Approved" && selectedLeaveForDetails.approvalDocuments && selectedLeaveForDetails.approvalDocuments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Approval Documents</p>
                  <div className="space-y-2">
                    {selectedLeaveForDetails.approvalDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-sm text-slate-900">{doc.fileName}</span>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-500"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLeaveForDetails.status === "Approved" && selectedLeaveForDetails.approvalMessage && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Approval Message</p>
                  <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{selectedLeaveForDetails.approvalMessage}</p>
                </div>
              )}

              {selectedLeaveForDetails.status === "Rejected" && selectedLeaveForDetails.rejectionReason && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rejection Reason</p>
                  <p className="text-sm text-rose-700 mt-1 whitespace-pre-wrap">{selectedLeaveForDetails.rejectionReason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                <div>
                  <p className="font-semibold">Created:</p>
                  <p>{new Date(selectedLeaveForDetails.createdAt).toLocaleString()}</p>
                </div>
                {selectedLeaveForDetails.approvedAt && (
                  <div>
                    <p className="font-semibold">Approved:</p>
                    <p>{new Date(selectedLeaveForDetails.approvedAt).toLocaleString()}</p>
                  </div>
                )}
                {selectedLeaveForDetails.rejectedAt && (
                  <div>
                    <p className="font-semibold">Rejected:</p>
                    <p>{new Date(selectedLeaveForDetails.rejectedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedLeaveForDetails.status === "Pending" && (
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeaveForDetails(null);
                      setLeaveDecisionModal({ leave: selectedLeaveForDetails, action: "approve" });
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLeaveForDetails(null);
                      setLeaveDecisionModal({ leave: selectedLeaveForDetails, action: "reject" });
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 font-medium"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Leave Decision Modal */}
      {leaveDecisionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            setLeaveDecisionModal(null);
            setLeaveDecisionReason("");
            setApprovalDocuments([]);
            setApprovalMessage("");
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {leaveDecisionModal.action === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
                </p>
                <p className="text-sm font-semibold text-slate-900">{leaveDecisionModal.leave.employeeName}</p>
              </div>
              <button
                onClick={() => {
                  setLeaveDecisionModal(null);
                  setLeaveDecisionReason("");
                  setApprovalDocuments([]);
                  setApprovalMessage("");
                }}
                className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center hover:bg-slate-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Type:</span> {formatLeaveType(leaveDecisionModal.leave.type)} • {leaveDecisionModal.leave.unit}
                </p>
                {leaveDecisionModal.leave.certificateUrl && (
                  <p className="mt-1">
                    <span className="font-semibold">Certificate:</span>{" "}
                    <a
                      href={leaveDecisionModal.leave.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View certificate
                    </a>
                  </p>
                )}
                {leaveDecisionModal.leave.employeeDocuments && leaveDecisionModal.leave.employeeDocuments.length > 0 && (
                  <div className="mt-1">
                    <p className="font-semibold mb-1">Employee Documents:</p>
                    <div className="flex flex-wrap gap-2">
                      {leaveDecisionModal.leave.employeeDocuments.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        >
                          {doc.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-1">
                  <span className="font-semibold">Dates:</span> {leaveDecisionModal.leave.startDate}
                  {leaveDecisionModal.leave.endDate &&
                    leaveDecisionModal.leave.endDate !== leaveDecisionModal.leave.startDate &&
                    ` → ${leaveDecisionModal.leave.endDate}`}
                </p>
              </div>

              {leaveDecisionModal.action === "approve" && leaveDecisionModal.leave.type === "Annual" && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 block">
                      Upload Documents (Optional)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Upload visa copy, ticket copy, or other supporting documents as PDF
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        const newDocs: Array<{ fileName: string; fileData: string }> = [];
                        for (const file of files) {
                          if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                            try {
                              const base64 = await handleFileUpload(file);
                              newDocs.push({ fileName: file.name, fileData: base64 });
                            } catch (error) {
                              toast.error(`Failed to process ${file.name}`);
                            }
                          } else {
                            toast.error(`${file.name} is not a PDF file`);
                          }
                        }
                        setApprovalDocuments((prev) => [...prev, ...newDocs]);
                      }}
                      className="w-full text-xs"
                    />
                    {approvalDocuments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {approvalDocuments.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                            <span className="truncate">{doc.fileName}</span>
                            <button
                              type="button"
                              onClick={() => setApprovalDocuments((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:text-rose-700 ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 block">
                      Message (Optional)
                    </label>
                    <textarea
                      value={approvalMessage}
                      onChange={(e) => setApprovalMessage(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Add a message for the employee..."
                    />
                    <p className="text-xs text-slate-500 mt-1">{approvalMessage.length}/2000</p>
                  </div>
                </div>
              )}

              {leaveDecisionModal.action === "reject" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 block">
                    Rejection Reason <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    value={leaveDecisionReason}
                    onChange={(e) => setLeaveDecisionReason(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Please provide a reason for rejecting this leave request..."
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">{leaveDecisionReason.length}/2000</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setLeaveDecisionModal(null);
                    setLeaveDecisionReason("");
                    setApprovalDocuments([]);
                    setApprovalMessage("");
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                  disabled={uploadingDocuments}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLeaveDecision}
                  disabled={uploadingDocuments || (leaveDecisionModal.action === "reject" && !leaveDecisionReason.trim())}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    leaveDecisionModal.action === "approve"
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "bg-rose-600 text-white hover:bg-rose-500"
                  } disabled:opacity-50`}
                >
                  {uploadingDocuments
                    ? "Processing..."
                    : leaveDecisionModal.action === "approve"
                    ? "Approve"
                    : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

