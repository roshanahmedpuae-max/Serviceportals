"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiMenu5Fill } from "react-icons/ri";
import { BiSolidHomeSmile } from "react-icons/bi";
import { FaSignOutAlt } from "react-icons/fa";
import { FaUser, FaFileWaveform, FaFileCircleQuestion, FaFaceGrinStars } from "react-icons/fa6";
import { IoMdArrowRoundBack } from "react-icons/io";
import { IoLogOut, IoNotifications } from "react-icons/io5";
import { SiTicktick } from "react-icons/si";
import { FaEye, FaRegEye } from "react-icons/fa";
import { HiDocumentCurrencyDollar } from "react-icons/hi2";
import { TiDelete } from "react-icons/ti";
import { TbListDetails } from "react-icons/tb";
import { FcOvertime } from "react-icons/fc";
import { LeaveRequest, LeaveType, LeaveUnit, OvertimeRequest } from "@/lib/types";
import toast, { Toaster } from "react-hot-toast";
import LandingPage from "@/components/LandingPage";
import ServiceOrderForm from "@/components/ServiceOrderForm";
import G3FacilityForm from "@/components/G3FacilityForm";
import ITServiceForm from "@/components/ITServiceForm";
import PayrollSignatureModal from "@/components/PayrollSignatureModal";
import { BusinessUnit, DailySchedule, Ticket, WorkOrder, Payroll, TicketStatus } from "@/lib/types";

type ServiceType = "printers-uae" | "g3-facility" | "it-service" | null;
type EmployeeOption = {
  id: string;
  name: string;
  businessUnit: BusinessUnit;
  role: string;
  status: string;
};
type EmployeeAuth = {
  id: string;
  name: string;
  businessUnit: BusinessUnit;
  role?: string;
  status?: string;
};

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

const SERVICE_CONFIG = {
  "printers-uae": {
    name: "Printers UAE",
    description: "Printer Service & Repair",
    gradient: "from-blue-600 to-purple-600",
    logo: "/P.png",
  },
  "g3-facility": {
    name: "G3 Facility",
    description: "Facility Management Work Orders",
    gradient: "from-emerald-600 to-teal-600",
    logo: null,
  },
  "it-service": {
    name: "IT Service",
    description: "IT Support & Technical Services",
    gradient: "from-purple-600 to-violet-600",
    logo: null,
  },
};

export default function Home() {
  const [selectedService, setSelectedService] = useState<ServiceType>(null);
  const [employeeAuth, setEmployeeAuth] = useState<EmployeeAuth | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [dailySchedules, setDailySchedules] = useState<DailySchedule[]>([]);
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [loadingEmployeeList, setLoadingEmployeeList] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedBu, setSelectedBu] = useState<BusinessUnit | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [assignmentDateFilter, setAssignmentDateFilter] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [prefilledWorkOrder, setPrefilledWorkOrder] = useState<WorkOrder | null>(null);
  const assignmentsRef = useRef<HTMLElement | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const [showEmployeeProfile, setShowEmployeeProfile] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [activeJobNumber, setActiveJobNumber] = useState<string | null>(null);
  const [employeeTickets, setEmployeeTickets] = useState<Ticket[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    sentAt: string;
    readAt?: string;
  }>>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [showPayrollSection, setShowPayrollSection] = useState(false);
  const [showEmployeeDocs, setShowEmployeeDocs] = useState(false);
  const [showLeaveSection, setShowLeaveSection] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
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
  const [ratingStats, setRatingStats] = useState<{ averageScore: number | null; count: number }>({
    averageScore: null,
    count: 0,
  });
  const [showRatings, setShowRatings] = useState(false);
  const [ratingDetails, setRatingDetails] = useState<
    { id: string; workOrderId: string; score: number; comment?: string; createdAt?: string }[]
  >([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [showAdvanceSalaryForm, setShowAdvanceSalaryForm] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("Annual");
  const [leaveUnit, setLeaveUnit] = useState<LeaveUnit>("FullDay");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveStartTime, setLeaveStartTime] = useState("");
  const [leaveEndTime, setLeaveEndTime] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveCertificateFile, setLeaveCertificateFile] = useState<string | null>(null);
  const [leaveDocuments, setLeaveDocuments] = useState<Array<{ fileName: string; fileData: string }>>([]);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [overtimeDate, setOvertimeDate] = useState("");
  const [overtimeStartTime, setOvertimeStartTime] = useState("");
  const [overtimeEndTime, setOvertimeEndTime] = useState("");
  const [overtimeProject, setOvertimeProject] = useState("");
  const [overtimeDescription, setOvertimeDescription] = useState("");
  const [submittingOvertime, setSubmittingOvertime] = useState(false);
  const [employeeDocs, setEmployeeDocs] = useState<
    {
      id: string;
      fileName: string;
      fileUrl: string;
      fileType?: string;
      docType?: string;
      uploadedAt: string;
      expiryDate?: string;
    }[]
  >([]);
  const [selectedPayrollForSigning, setSelectedPayrollForSigning] = useState<Payroll | null>(null);
  const [rejectingPayrollId, setRejectingPayrollId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  const buServiceKey: Record<BusinessUnit, ServiceType> = {
    PrintersUAE: "printers-uae",
    G3: "g3-facility",
    IT: "it-service",
  };

  const handleSelectService = (service: ServiceType) => {
    setSelectedService(service);
  };

  const handleBack = () => {
    setPrefilledWorkOrder(null);
    setActiveJobNumber(null);
    if (employeeAuth) {
      setSelectedService(employeeAuth ? buServiceKey[employeeAuth.businessUnit] : null);
    } else {
      setSelectedService(null);
    }
  };

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!employeeAuth) throw new Error("Not signed in");
      const res = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Request failed");
      }
      return res.json();
    },
    [employeeAuth]
  );

  const loadPayrolls = async () => {
    if (!employeeAuth) return;
    try {
      const data = await authedFetch("/api/payroll");
      setPayrolls(Array.isArray(data) ? data : []);
    } catch (error) {
      setPayrolls([]);
    }
  };

  const loadEmployeeData = async () => {
    if (!employeeAuth) return;
    setLoadingEmployee(true);
    try {
      const [orders, schedules, tickets, ratings] = await Promise.all([
        authedFetch("/api/work-orders"),
        employeeAuth.businessUnit === "PrintersUAE"
          ? authedFetch(
              `/api/daily-schedules${
                assignmentDateFilter ? `?date=${encodeURIComponent(assignmentDateFilter)}` : ""
              }`
            )
          : Promise.resolve([]),
        authedFetch("/api/tickets"),
        authedFetch("/api/ratings/employee"),
      ]);
      setWorkOrders(orders);
      if (employeeAuth.businessUnit === "PrintersUAE") {
        setDailySchedules(Array.isArray(schedules) ? schedules : []);
      } else {
        setDailySchedules([]);
      }
      setEmployeeTickets(Array.isArray(tickets) ? tickets : []);
      if (ratings) {
        setRatingStats({
          averageScore: typeof ratings.averageScore === "number" ? ratings.averageScore : null,
          count: typeof ratings.count === "number" ? ratings.count : 0,
        });
        setRatingDetails(Array.isArray(ratings.ratings) ? ratings.ratings : []);
      }
      
      // Load employee notifications
      try {
        const notifData = await authedFetch("/api/employee/notifications");
        setNotifications(Array.isArray(notifData) ? notifData : []);
        setNotificationCount(notifData.filter((n: any) => !n.readAt).length);
      } catch {
        setNotifications([]);
        setNotificationCount(0);
      }
      
      await loadPayrolls();
    } catch (error) {
      // Silently handle 403 errors (feature access denied) - expected for employees without feature access
      // Since we've removed feature access requirements for employee portal, these shouldn't occur, but handle gracefully
      const errorMessage = (error as Error).message;
      if (!errorMessage.includes("Forbidden") && !errorMessage.includes("Feature access")) {
        toast.error(errorMessage);
      }
    } finally {
      setLoadingEmployee(false);
    }
  };

  const loadEmployees = async () => {
    setLoadingEmployeeList(true);
    try {
      const res = await fetch("/api/auth/employee/list", { credentials: "include" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Unable to load employees");
      }
      const data = (await res.json()) as EmployeeOption[];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load employees:", error);
      // Set empty array instead of showing error to prevent UI breakage
      setEmployees([]);
      // Only show toast if it's not a network error (to avoid spam)
      if (error instanceof Error && !error.message.includes("fetch")) {
        toast.error(error.message);
      }
    } finally {
      setLoadingEmployeeList(false);
    }
  };

  // Restore existing employee session from cookie on first load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user?.role === "employee") {
          setEmployeeAuth({
            id: data.user.id,
            name: data.user.name ?? "Employee",
            businessUnit: data.user.businessUnit,
            role: data.user.role,
            status: data.user.status,
          });
          // When restoring a session, default to the Assigned Jobs view
          setShowAssignments(true);
        }
      } catch {
        // silently ignore – user is simply not logged in
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const loadLeaves = async () => {
      if (!employeeAuth || !showLeaveSection) return;
      setLeaveLoading(true);
      try {
        const res = await fetch("/api/employee/leave", { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load leave requests");
        }
        const data = (await res.json()) as LeaveRequest[];
        setLeaveRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load leave requests");
        setLeaveRequests([]);
      } finally {
        setLeaveLoading(false);
      }
    };
    loadLeaves();
  }, [employeeAuth, showLeaveSection]);

  useEffect(() => {
    const loadOvertimes = async () => {
      if (!employeeAuth || !showLeaveSection) return;
      setOvertimeLoading(true);
      try {
        const res = await fetch("/api/employee/overtime", { credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load overtime requests");
        }
        const data = (await res.json()) as OvertimeRequest[];
        setOvertimeRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load overtime requests");
        setOvertimeRequests([]);
      } finally {
        setOvertimeLoading(false);
      }
    };
    loadOvertimes();
  }, [employeeAuth, showLeaveSection]);

  useEffect(() => {
    const loadAdvanceSalaryRequests = async () => {
      if (!employeeAuth || !showPayrollSection) return;
      try {
        const advances = await authedFetch("/api/employee/advance-salary");
        setAdvanceSalaryRequests(Array.isArray(advances) ? advances : []);
      } catch (error) {
        toast.error((error as Error).message || "Failed to load advance salary requests");
        setAdvanceSalaryRequests([]);
      }
    };
    loadAdvanceSalaryRequests();
  }, [employeeAuth, showPayrollSection, authedFetch]);

  const resetLeaveForm = () => {
    setLeaveType("Annual");
    setLeaveUnit("FullDay");
    setLeaveStartDate("");
    setLeaveEndDate("");
    setLeaveStartTime("");
    setLeaveEndTime("");
    setLeaveReason("");
    setLeaveCertificateFile(null);
    setLeaveDocuments([]);
  };

  const handleSubmitLeave = async () => {
    if (!employeeAuth) return;
    if (!leaveStartDate) {
      toast.error("Please select a start date");
      return;
    }
    if ((leaveUnit === "FullDay" || leaveUnit === "HalfDay") && leaveEndDate && leaveEndDate < leaveStartDate) {
      toast.error("End date cannot be before start date");
      return;
    }
    if (leaveUnit === "HalfDay" && (!leaveStartTime || !leaveEndTime)) {
      toast.error("Please select both start and end time");
      return;
    }
    if (!leaveReason.trim() || leaveReason.trim().length < 5) {
      toast.error("Please provide a clear reason (at least 5 characters)");
      return;
    }
    if (leaveType === "SickWithCertificate" && !leaveCertificateFile) {
      toast.error("Please upload a certificate for sick leave with certificate");
      return;
    }
    setSubmittingLeave(true);
    try {
      const res = await fetch("/api/employee/leave", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: leaveType,
          unit: leaveType === "Annual" ? "FullDay" : leaveUnit,
          startDate: leaveStartDate,
          endDate: leaveEndDate || undefined,
          startTime: leaveUnit === "HalfDay" ? leaveStartTime || undefined : undefined,
          endTime: leaveUnit === "HalfDay" ? leaveEndTime || undefined : undefined,
          reason: leaveReason.trim(),
          certificateFile: leaveCertificateFile || undefined,
          documents: leaveDocuments.length > 0 ? leaveDocuments : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit leave request");
      }
      const created = data as LeaveRequest;
      setLeaveRequests((prev) => [created, ...prev]);
      toast.success("Leave request submitted for approval");
      resetLeaveForm();
      setShowLeaveForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit leave request");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const resetOvertimeForm = () => {
    setOvertimeDate("");
    setOvertimeStartTime("");
    setOvertimeEndTime("");
    setOvertimeProject("");
    setOvertimeDescription("");
  };

  const calculateOvertimeHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map((v) => Number(v));
    const [eh, em] = end.split(":").map((v) => Number(v));
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0;
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) return 0;
    const totalMinutes = endMinutes - startMinutes;
    return Math.round((totalMinutes / 60) * 100) / 100;
  };

  const handleSubmitOvertime = async () => {
    if (!employeeAuth) return;
    if (!overtimeDate) {
      toast.error("Please select a date");
      return;
    }
    if (!overtimeStartTime || !overtimeEndTime) {
      toast.error("Please select both start and end time");
      return;
    }
    if (!overtimeDescription.trim() || overtimeDescription.trim().length < 5) {
      toast.error("Please provide a clear description (at least 5 characters)");
      return;
    }
    const hours = calculateOvertimeHours(overtimeStartTime, overtimeEndTime);
    if (hours < 0.5) {
      toast.error("Overtime must be at least 0.5 hours (30 minutes)");
      return;
    }
    if (hours > 12) {
      toast.error("Overtime cannot exceed 12 hours per day");
      return;
    }
    setSubmittingOvertime(true);
    try {
      const res = await fetch("/api/employee/overtime", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: overtimeDate,
          startTime: overtimeStartTime,
          endTime: overtimeEndTime,
          project: overtimeProject.trim() || undefined,
          description: overtimeDescription.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit overtime request");
      }
      const created = data as OvertimeRequest;
      setOvertimeRequests((prev) => [created, ...prev]);
      toast.success("Overtime request submitted for approval");
      resetOvertimeForm();
      setShowOvertimeForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit overtime request");
    } finally {
      setSubmittingOvertime(false);
    }
  };

  const handleCancelOvertime = async (id: string) => {
    try {
      const res = await fetch("/api/employee/overtime", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel overtime request");
      }
      const updated = data as OvertimeRequest;
      setOvertimeRequests((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success("Overtime request cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel overtime request");
    }
  };

  const handleCancelLeave = async (id: string) => {
    try {
      const res = await fetch("/api/employee/leave", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel leave request");
      }
      const updated = data as LeaveRequest;
      setLeaveRequests((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      toast.success("Leave request cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel leave request");
    }
  };

  // Load employee documents when the documents page is opened
  useEffect(() => {
    if (!employeeAuth || !showEmployeeDocs) return;
    const loadDocs = async () => {
      try {
        const data = await authedFetch("/api/employee/documents");
        setEmployeeDocs(
          Array.isArray(data)
            ? data.map((d: any) => ({
                id: d.id,
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                fileType: d.fileType,
                docType: d.docType,
                uploadedAt: d.uploadedAt,
                expiryDate: d.expiryDate,
              }))
            : []
        );
      } catch (error) {
        setEmployeeDocs([]);
        toast.error(error instanceof Error ? error.message : "Failed to load documents");
      }
    };
    loadDocs();
  }, [employeeAuth, showEmployeeDocs, authedFetch]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (employeeAuth) {
      setSelectedService(buServiceKey[employeeAuth.businessUnit]);
      loadEmployeeData();
    }
  }, [employeeAuth]);

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

  useEffect(() => {
    if (employeeAuth?.businessUnit === "PrintersUAE") {
      loadEmployeeData();
    }
  }, [employeeAuth?.businessUnit, assignmentDateFilter]);

  // Refresh work orders when window regains focus (for employees)
  useEffect(() => {
    if (employeeAuth) {
      const handleFocus = () => {
        loadEmployeeData();
      };
      window.addEventListener("focus", handleFocus);
      return () => window.removeEventListener("focus", handleFocus);
    }
  }, [employeeAuth]);

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

  // Periodic polling to refresh work orders every 30 seconds (for employees)
  useEffect(() => {
    if (employeeAuth) {
      const interval = setInterval(() => {
        loadEmployeeData();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [employeeAuth]);

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

  // Refresh employee notifications periodically
  useEffect(() => {
    if (!employeeAuth) return;

    const refreshNotifications = async () => {
      try {
        const notifData = await authedFetch("/api/employee/notifications");
        setNotifications(Array.isArray(notifData) ? notifData : []);
        setNotificationCount(notifData.filter((n: any) => !n.readAt).length);
      } catch {
        // Ignore errors
      }
    };

    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [employeeAuth, authedFetch]);

  // Refresh employee list when login modal opens
  useEffect(() => {
    if (showLoginModal) {
      loadEmployees();
    }
  }, [showLoginModal]);

  useEffect(() => {
    if (!showLoginModal) {
      setSelectedEmployeeId(null);
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

  // Periodic polling to refresh employee list every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadEmployees();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Refresh employee list when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      loadEmployees();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || null;
  const filteredEmployees = selectedBu
    ? employees.filter((e) => e.businessUnit === selectedBu)
    : [];

  const scrollToAssignments = () => {
    // Ensure only the Assigned Jobs "page" is visible
    setShowPayrollSection(false);
    setShowEmployeeDocs(false);
    setShowLeaveSection(false);
    setShowAssignments(true);
    setTimeout(() => {
      assignmentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const scrollToFormTop = () => {
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const openEmptyForm = () => {
    setPrefilledWorkOrder(null);
    setActiveJobNumber(generateJobNumber());
    setShowAssignments(false);
    scrollToFormTop();
  };

  const completedOrders = workOrders.filter((w) => w.status === "Submitted");

  const handleRejectPayroll = async () => {
    if (!rejectingPayrollId) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    try {
      const res = await fetch(`/api/payroll/${rejectingPayrollId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject payroll");
      }
      toast.success("Payroll rejected");
      setRejectingPayrollId(null);
      setRejectReason("");
      await loadPayrolls();
    } catch (error) {
      toast.error((error as Error).message || "Failed to reject payroll");
    }
  };

  const handleEmployeeLogin = async (formData: FormData) => {
    const password = formData.get("password") as string;
    if (!selectedEmployee) {
      toast.error("Select your profile to continue");
      return;
    }
    setLoadingEmployee(true);
    try {
      const res = await fetch("/api/auth/employee", {
        method: "POST",
        body: JSON.stringify({
          name: selectedEmployee.name,
          password,
          businessUnit: selectedEmployee.businessUnit,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Login failed");
      }
      const data = await res.json();
      setEmployeeAuth({ ...data.employee });
      setShowAssignments(true);
      setTimeout(() => scrollToAssignments(), 150);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoadingEmployee(false);
    }
  };

  const handleEmployeeSubmit = async (workOrderId: string, payload: Partial<WorkOrder>) => {
    try {
      const updated = await authedFetch("/api/work-orders", {
        method: "PUT",
        body: JSON.stringify({ id: workOrderId, ...payload }),
      });
      setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      toast.success("Submission saved");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleEmployeeLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setEmployeeAuth(null);
    setWorkOrders([]);
    setDailySchedules([]);
    setSelectedService(null);
  };

  const handleEmployeeUpdateTicketStatus = async (id: string, status: TicketStatus) => {
    try {
      setUpdatingTicketId(id);
      const updated = await authedFetch("/api/tickets", {
        method: "PUT",
        body: JSON.stringify({ id, status }),
      });
      setEmployeeTickets((prev) => {
        const updatedTickets = prev.map((t) => (t.id === updated.id ? updated : t));
        // Update notification count
        setNotificationCount(updatedTickets.filter((t) => t.status !== "Closed").length);
        return updatedTickets;
      });
      toast.success("Ticket status updated");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const theme = (() => {
    const bu = employeeAuth?.businessUnit ?? (selectedBu ?? "PrintersUAE");
    switch (bu) {
      case "G3":
        return { text: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50" };
      case "IT":
        return { text: "text-purple-600", border: "border-purple-200", bg: "bg-purple-50" };
      default:
        return { text: "text-indigo-600", border: "border-indigo-200", bg: "bg-indigo-50" };
    }
  })();

  const logoutButtonTheme = (() => {
    const bu = employeeAuth?.businessUnit ?? "PrintersUAE";
    switch (bu) {
      case "G3":
        return {
          bg: "bg-emerald-600",
          hover: "hover:bg-emerald-500",
          ring: "focus:ring-emerald-300",
          shadow: "shadow-emerald-400/50",
        };
      case "IT":
        return {
          bg: "bg-purple-600",
          hover: "hover:bg-purple-500",
          ring: "focus:ring-purple-300",
          shadow: "shadow-purple-400/50",
        };
      default:
        return {
          bg: "bg-indigo-600",
          hover: "hover:bg-indigo-500",
          ring: "focus:ring-indigo-300",
          shadow: "shadow-indigo-400/50",
        };
    }
  })();

  const totalWorkCount = (() => {
    const activeWorkOrders = workOrders.filter((w) => w.status !== "Submitted").length;
    const schedulesCount = dailySchedules.length;
    return activeWorkOrders + schedulesCount;
  })();

  const toaster = <Toaster position="top-right" />;

  // Generate a new job number for empty forms
  const generateJobNumber = () => {
    const ts = Date.now().toString(36).toUpperCase();
    return `WO-${ts.slice(-8)}`;
  };

  if (!employeeAuth) {
    return (
      <main className="relative min-h-screen min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50 overflow-hidden">
        {toaster}
        {/* floating accents */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl animate-pulse" />
          <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-10 min-h-[80vh]">
          <div className="text-center mb-6 animate-fade-in">
            <p className="text-sm text-slate-200 uppercase tracking-[0.2em]">Employee Access</p>
            <h1 className="text-3xl font-bold text-white mt-1">Choose your Business Unit</h1>
            <p className="text-sm text-slate-300 mt-1">Pick your BU, then select your profile to sign in.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
            {[
              { key: "printers-uae", label: "Printers UAE", bu: "PrintersUAE" as BusinessUnit, gradient: "from-blue-600 to-purple-600" },
              { key: "g3-facility", label: "G3 Facility", bu: "G3" as BusinessUnit, gradient: "from-emerald-600 to-teal-600" },
              { key: "it-service", label: "IT Service", bu: "IT" as BusinessUnit, gradient: "from-purple-600 to-violet-600" },
            ].map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setSelectedBu(card.bu);
                  setShowLoginModal(true);
                  setSelectedEmployeeId(null);
                }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md shadow-xl hover:shadow-2xl hover:-translate-y-1 transition group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-70 group-hover:opacity-90 transition`} />
                <div className="relative px-5 py-6 text-left text-white space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
                    {card.label.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm text-white/80">Business Unit</p>
                    <h3 className="text-xl font-semibold">{card.label}</h3>
                  </div>
                  <p className="text-xs text-white/80">Click to select employees in {card.label}.</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {showLoginModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          >
            <div
              className="w-full max-w-3xl bg-white/95 text-slate-900 rounded-3xl shadow-2xl border border-white/40 overflow-hidden animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/80">Employee Login</p>
                  <h2 className="text-xl font-bold mt-1">
                    {selectedBu ? `${selectedBu} team` : "Select BU"}
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
              <div className="p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedBu ? `Profiles in ${selectedBu}` : "Select a BU to load profiles"}
                  </p>
                  <button
                    type="button"
                    onClick={loadEmployees}
                    className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                    disabled={loadingEmployeeList}
                  >
                    {loadingEmployeeList ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                  {filteredEmployees.map((emp) => {
                    const active = emp.id === selectedEmployeeId;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className={`flex items-center gap-3 w-full rounded-2xl border px-3 py-3 text-left shadow-sm transition ${
                          active
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-slate-200 bg-white hover:border-indigo-200"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
                          {emp.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500">
                            {emp.role} • {emp.businessUnit}
                          </p>
                        </div>
                        {active && (
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {!loadingEmployeeList && filteredEmployees.length === 0 && (
                    <p className="text-sm text-slate-500">No employees for this BU.</p>
                  )}
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEmployeeLogin(new FormData(e.currentTarget));
                  }}
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showEmployeePassword ? "text" : "password"}
                        required
                        placeholder={selectedEmployee ? "Enter your password" : "Select your profile first"}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-200 transition"
                        disabled={!selectedEmployee}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmployeePassword((prev) => !prev)}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                        aria-label={showEmployeePassword ? "Hide password" : "Show password"}
                      >
                        {showEmployeePassword ? (
                          <FaEye className="w-5 h-5" />
                        ) : (
                          <FaRegEye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loadingEmployee || !selectedEmployee}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-emerald-500 text-white rounded-xl py-3 font-semibold shadow-lg shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60"
                    >
                      {loadingEmployee ? "Signing in..." : selectedEmployee ? "Sign in" : "Select profile"}
                    </button>
                    {selectedEmployee && (
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeId(null)}
                        className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>
                <p className="text-xs text-slate-500">
                  Select your BU, choose your profile, then enter your password to access assignments.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // Show landing page if no service selected
  if (!selectedService) {
    if (employeeAuth) {
      // Return a loading state while service is being set
      return (
        <main className="min-h-screen min-h-[100dvh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        </main>
      );
    }
    return (
      <div className="relative">
        {toaster}
        <LandingPage onSelectService={handleSelectService} />
      </div>
    );
  }

  // At this point, selectedService is guaranteed to be non-null after the check above
  // TypeScript type narrowing - use type assertion since we've already checked
  const config = SERVICE_CONFIG[selectedService as "printers-uae" | "g3-facility" | "it-service"];
  if (!config) {
    return (
      <main className="min-h-screen min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Invalid service selected</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-h-[100dvh] pb-24 sm:pb-8 px-3 sm:px-6 lg:px-8">
      {toaster}
      <div className="max-w-4xl mx-auto">
        {/* Work Form view (hidden when assignments, payroll, or employee docs are open) */}
        {!showAssignments && !showPayrollSection && !showEmployeeDocs && !showLeaveSection && (
          <>
            {/* Header - Compact on mobile */}
            <div ref={formTopRef} className="flex items-center justify-center mb-4 sm:mb-8 animate-fade-in">
              <div className="text-center">
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">
                  Service Order Form
                </h1>
                <p className="text-white/80 text-sm sm:text-lg">
                  {config.name} - {config.description}
                </p>
              </div>
            </div>

            {/* Form Container - Full width on mobile */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden mobile-card border border-white/40">
              {/* Header Bar - Compact on mobile */}
              <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between`}>
                <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                  {config.logo ? (
                    <img 
                      src={config.logo} 
                      alt={`${config.name} Logo`} 
                      className="w-6 h-6 sm:w-8 sm:h-8 object-contain" 
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center">
                      {selectedService === "g3-facility" ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  )}
                  <span>{config.name}</span>
                </h2>
                <div className="flex items-center gap-1.5 sm:gap-2 text-white">
                  <span className="text-sm sm:text-lg font-semibold">Work Order</span>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {activeJobNumber && (
                    <span className="text-xs sm:text-sm font-medium text-white/90">
                      - {activeJobNumber}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Render the appropriate form based on selected service */}
              {selectedService === "printers-uae" && (
                <ServiceOrderForm 
                  onBack={handleBack} 
                  businessUnit="PrintersUAE" 
                  prefilledData={prefilledWorkOrder || undefined}
                />
              )}
              {selectedService === "g3-facility" && (
                <G3FacilityForm 
                  onBack={handleBack} 
                  businessUnit="G3" 
                  prefilledData={prefilledWorkOrder || undefined}
                />
              )}
              {selectedService === "it-service" && (
                <ITServiceForm 
                  onBack={handleBack} 
                  businessUnit="IT" 
                  prefilledData={prefilledWorkOrder || undefined}
                />
              )}
            </div>
          </>
        )}

        {/* Footer - Smaller on mobile */}
        <footer className="mt-4 sm:mt-8 text-center text-white/60 text-xs sm:text-sm pb-4">
          <p>© {new Date().getFullYear()} {config.name}. All rights reserved.</p>
        </footer>
      </div>

      {employeeAuth && showAssignments ? (
        <div className="mt-4 flex justify-center">
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                ref={notificationButtonRef}
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white shadow hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition relative"
                title="Notifications"
              >
                <IoNotifications className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-semibold flex items-center justify-center text-white border border-white shadow-sm">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div data-notification-dropdown className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                        <div className="overflow-y-auto flex-1">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-sm">
                              No notifications available
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  className="p-4 hover:bg-slate-50 transition cursor-pointer"
                                  onClick={async () => {
                                    if (!notification.readAt) {
                                      try {
                                        await authedFetch("/api/employee/notifications", {
                                          method: "POST",
                                          body: JSON.stringify({ id: notification.id, action: "read" }),
                                        });
                                        // Refresh notifications
                                        const notifData = await authedFetch("/api/employee/notifications");
                                        setNotifications(Array.isArray(notifData) ? notifData : []);
                                        setNotificationCount(notifData.filter((n: any) => !n.readAt).length);
                                      } catch {
                                        // Ignore errors
                                      }
                                    }
                                    setShowNotifications(false);
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                      notification.type === "leave_approval" ? "bg-blue-500" :
                                      notification.type === "payroll" ? "bg-green-500" :
                                      notification.type === "document_update" ? "bg-purple-500" :
                                      "bg-indigo-500"
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                        {notification.title}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        {new Date(notification.sentAt).toLocaleString()}
                                      </p>
                                    </div>
                                    {!notification.readAt && (
                                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCompletedModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow hover:bg-emerald-100"
              title="View submitted jobs"
            >
              <SiTicktick className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={openEmptyForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 border border-slate-200 shadow hover:bg-slate-50"
              title="Open new empty form"
            >
              <FaFileWaveform className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmployeeProfile(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-white border border-slate-700 shadow hover:bg-slate-700"
              title="Profile"
            >
              <FaUser className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : !employeeAuth ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 text-slate-900 border border-slate-200 shadow hover:bg-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Services
          </button>
        </div>
      ) : null}

      {employeeAuth && !showAssignments && !showEmployeeDocs && !showLeaveSection && (
        <button
          type="button"
          onClick={scrollToAssignments}
          className="hidden lg:inline-flex fixed bottom-6 right-20 z-40 items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          title="Go to assigned jobs"
        >
          <IoMdArrowRoundBack className="w-6 h-6" />
        </button>
      )}
      {employeeAuth && showEmployeeDocs && (
        <button
          type="button"
          onClick={scrollToAssignments}
          className="hidden lg:inline-flex fixed bottom-6 right-20 z-40 items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          title="Back to assigned jobs"
        >
          <IoMdArrowRoundBack className="w-6 h-6" />
        </button>
      )}
      {employeeAuth && showLeaveSection && (
        <button
          type="button"
          onClick={scrollToAssignments}
          className="hidden lg:inline-flex fixed bottom-6 right-20 z-40 items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          title="Back to assigned jobs"
        >
          <IoMdArrowRoundBack className="w-6 h-6" />
        </button>
      )}
      {employeeAuth && showAssignments && (
        <button
          type="button"
          onClick={() => {
            setShowAssignments(false);
            setShowPayrollSection(false);
            setShowEmployeeDocs(true);
            setShowLeaveSection(false);
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="hidden lg:inline-flex fixed bottom-40 right-6 z-40 items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-white shadow-lg shadow-slate-600/40 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          title="View employee documents"
        >
          <TbListDetails className="w-6 h-6" />
        </button>
      )}
      {employeeAuth && showAssignments && (
        <>
          <button
            type="button"
            onClick={() => {
              setShowAssignments(false);
              setShowPayrollSection(false);
              setShowEmployeeDocs(false);
              setShowLeaveSection(true);
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="hidden lg:inline-flex fixed bottom-56 right-6 z-40 items-center justify-center w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-700/40 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            title="Request leave"
          >
            <FaFileCircleQuestion className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setShowRatings(true)}
            className="hidden lg:inline-flex fixed bottom-72 right-6 z-40 items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-400/40 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            title="View your ratings"
          >
            <FaFaceGrinStars className="w-6 h-6" />
          </button>
        </>
      )}
      {employeeAuth && (
        <button
          type="button"
          onClick={handleEmployeeLogout}
          className={`fixed bottom-6 right-6 z-40 hidden lg:inline-flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg ${logoutButtonTheme.shadow} ${logoutButtonTheme.bg} ${logoutButtonTheme.hover} focus:outline-none focus:ring-2 ${logoutButtonTheme.ring}`}
          title="Sign out"
        >
          <IoLogOut className="w-6 h-6" />
        </button>
      )}

      {showAssignments && (
        <section ref={assignmentsRef} className="max-w-4xl mx-auto mt-6 bg-white/95 rounded-2xl shadow-2xl p-5 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Assigned Work & Tickets</h3>
              <p className="text-xs text-slate-500">Review your scheduled work orders and support tickets.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                Jobs: {totalWorkCount}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                Tickets:{" "}
                {employeeTickets.filter((t) => {
                  if (!assignmentDateFilter) return true;
                  return t.assignmentDate === assignmentDateFilter;
                }).length}
              </span>
              <label className="text-xs text-slate-600">Filter by date</label>
              <input
                type="date"
                value={assignmentDateFilter}
                onChange={(e) => setAssignmentDateFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
            </div>
            {loadingEmployee && <span className="text-xs text-slate-500">Refreshing...</span>}
          </div>
          {employeeAuth.businessUnit === "PrintersUAE" && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Daily Work Schedule</p>
                  <p className="text-xs text-indigo-700/80">
                    Only shows schedules assigned to you for the selected date.
                  </p>
                </div>
              </div>
              {dailySchedules.length === 0 ? (
                <p className="text-sm text-indigo-900/80">No schedule for this date.</p>
              ) : (
                <div className="space-y-2">
                  {dailySchedules.map((entry) => {
                    const headerName =
                      Array.isArray(entry.employeeNames) && entry.employeeNames.length > 0
                        ? entry.employeeNames.join(" & ")
                        : ((entry as any).employeeName as string | undefined) ??
                          (Array.isArray(entry.employeeIds) ? entry.employeeIds.join(", ") : "—");

                    const assignedWorkForDate = workOrders
                      .filter((w) => w.status !== "Submitted")
                      .filter((w) => {
                        if (!assignmentDateFilter) return true;
                        const date = new Date(w.orderDateTime);
                        const iso = date.toISOString().slice(0, 10);
                        return iso === assignmentDateFilter;
                      })
                      .map((w) => {
                        const name = w.customerName ?? "Work order";
                        const loc = w.locationAddress ? ` (${w.locationAddress})` : "";
                        return `${name}${loc}`;
                      });

                    const combinedTasks = [...entry.tasks.map((t) => t.text), ...assignedWorkForDate];

                    return (
                      <div
                        key={entry.id}
                        className="bg-white rounded-lg border border-indigo-100 p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-indigo-900">{headerName}</p>
                          <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                            {entry.date}
                          </span>
                        </div>
                        <ol className="list-decimal pl-5 text-sm text-slate-800 space-y-1 mt-2">
                          {combinedTasks.map((task, idx) => (
                            <li key={idx}>{task}</li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {employeeAuth && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 space-y-3 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FaFaceGrinStars className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Your Customer Ratings</p>
                    <p className="text-xs text-amber-800/80">
                      Average rating from customers based on completed jobs.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-900">
                      {ratingStats.averageScore ? ratingStats.averageScore.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-amber-800/80">
                      {ratingStats.count} rating{ratingStats.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRatings(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-3 py-1 text-xs font-semibold shadow hover:bg-amber-400"
                  >
                    <FaFaceGrinStars className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {workOrders.length === 0 && (
            <p className="text-sm text-slate-500">No work order assignments yet.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workOrders
              .filter((w) => {
                if (!assignmentDateFilter) return true;
                const date = new Date(w.orderDateTime);
                if (Number.isNaN(date.getTime())) return false;
                const iso = date.toISOString().slice(0, 10);
                return iso === assignmentDateFilter;
              })
              .sort((a, b) => (a.orderDateTime > b.orderDateTime ? 1 : -1))
              .map((w) => {
                // Format job number (use first 8 characters of ID for readability)
                const jobNumber = `WO-${w.id.slice(0, 8).toUpperCase()}`;
                const isCompleted = w.status === "Submitted";
                return (
                  <div
                    key={w.id}
                    className="rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 p-4 space-y-3 transition-all shadow-sm hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPrefilledWorkOrder(w);
                        const jobNumber = `WO-${w.id.slice(0, 8).toUpperCase()}`;
                        setActiveJobNumber(jobNumber);
                        setShowAssignments(false);
                        scrollToFormTop();
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                            Job Number
                          </p>
                          <p className="text-lg font-bold text-slate-900 mb-3">{jobNumber}</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Customer Name</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {w.customerName ?? "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Location</p>
                              <p className="text-sm text-slate-700">{w.locationAddress}</p>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full ${
                            w.status === "Assigned"
                              ? "bg-blue-100 text-blue-700"
                              : w.status === "Submitted"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-indigo-600 font-medium">Click to open form →</p>
                      </div>
                    </button>
                    {isCompleted && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/ratings/link", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ workOrderId: w.id }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              throw new Error(data.error || "Failed to generate rating link");
                            }
                            const link = data.link as string;
                            if (navigator.clipboard && link) {
                              await navigator.clipboard.writeText(link);
                              toast.success("Rating link copied. Share it with the customer.");
                            } else {
                              toast.success("Rating link generated. Please copy it from the browser.");
                            }
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Failed to generate rating link"
                            );
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-500 text-white px-3 py-1 text-xs font-semibold shadow hover:bg-amber-400"
                      >
                        <FaFaceGrinStars className="w-3 h-3" />
                        <span>Copy rating link</span>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Assigned Tickets</h4>
              <span className="text-xs text-slate-500">
                {employeeTickets.filter((t) => {
                  if (!assignmentDateFilter) return true;
                  return t.assignmentDate === assignmentDateFilter;
                }).length}{" "}
                tickets
              </span>
            </div>
            {employeeTickets.filter((t) => {
              if (!assignmentDateFilter) return true;
              return t.assignmentDate === assignmentDateFilter;
            }).length === 0 ? (
              <p className="text-sm text-slate-500">
                {assignmentDateFilter
                  ? `No tickets assigned to you for ${assignmentDateFilter}.`
                  : "No tickets assigned to you yet."}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {employeeTickets
                  .filter((t) => {
                    if (!assignmentDateFilter) return true;
                    return t.assignmentDate === assignmentDateFilter;
                  })
                  .map((t) => {
                  // Get assigned employee IDs from ticket
                  const assignedIds = (t.assignedEmployeeIds && t.assignedEmployeeIds.length > 0)
                    ? t.assignedEmployeeIds
                    : (t.assignedEmployeeId ? [t.assignedEmployeeId] : []);
                  
                  // Map IDs to employee objects
                  const assignedEmployees = assignedIds
                    .map(id => employees.find(e => e.id === id))
                    .filter((emp): emp is EmployeeOption => !!emp);
                  
                  // Format heading: current employee first, then others
                  // Only show heading when 2+ employees are assigned
                  let headingText = "";
                  if (assignedEmployees.length >= 2) {
                    const currentEmployeeId = employeeAuth?.id;
                    const currentIndex = assignedEmployees.findIndex(emp => emp.id === currentEmployeeId);
                    
                    if (currentIndex >= 0) {
                      // Current employee found, put them first
                      const [currentEmployee, ...otherEmployees] = [
                        assignedEmployees[currentIndex],
                        ...assignedEmployees.slice(0, currentIndex),
                        ...assignedEmployees.slice(currentIndex + 1)
                      ];
                      const otherNames = otherEmployees.map(e => e.name);
                      headingText = `${currentEmployee.name} & ${otherNames.join(" & ")}`;
                    } else {
                      // Current employee not in list (shouldn't happen, but handle gracefully)
                      headingText = assignedEmployees.map(e => e.name).join(" & ");
                    }
                  }
                  // If only 1 employee is assigned, headingText remains empty (no heading shown)
                  
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1"
                    >
                      {headingText && (
                        <div className="mb-2 pb-2 border-b border-slate-200">
                          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                            {headingText}
                          </p>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                            {t.subject}
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {t.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px]">
                            {t.status}
                          </span>
                          <select
                            value={t.status}
                            onChange={(e) =>
                              handleEmployeeUpdateTicketStatus(t.id, e.target.value as TicketStatus)
                            }
                            disabled={updatingTicketId === t.id}
                            className="mt-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                          >
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Priority: {t.priority}</span>
                        <span>
                          Updated{" "}
                          {Number.isNaN(new Date(t.updatedAt).getTime())
                            ? "—"
                            : new Date(t.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {employeeAuth && (
        <>
          {/* Employee profile modal */}
          {showEmployeeProfile && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setShowEmployeeProfile(false)}
            >
              <div
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center">
                      <FaUser className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Employee Profile</p>
                      <p className="text-sm font-semibold text-slate-900">{employeeAuth.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEmployeeProfile(false)}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center"
                    aria-label="Close employee profile"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5 space-y-3 text-sm text-slate-800">
                  <p><span className="font-semibold">Business Unit:</span> {employeeAuth.businessUnit}</p>
                  <p><span className="font-semibold">Name:</span> {employeeAuth.name}</p>
                  <p><span className="font-semibold">ID:</span> {employeeAuth.id}</p>
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={() => {
                      setShowEmployeeProfile(false);
                      handleEmployeeLogout();
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}

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
                  onClick={() => {
                    setShowPayrollSection(false);
                    setShowEmployeeDocs(false);
                    scrollToAssignments();
                  }}
                  className={`flex flex-col items-center gap-1 flex-1 text-xs font-medium ${theme.text}`}
                >
                  <span className={`w-10 h-10 rounded-2xl grid place-items-center border ${theme.border} ${theme.bg}`}>
                    <BiSolidHomeSmile className={`w-5 h-5 ${theme.text}`} />
                  </span>
                  Home
                </button>
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`flex flex-col items-center gap-1 w-full text-xs font-medium ${theme.text}`}
                  >
                    <span className={`w-10 h-10 rounded-2xl grid place-items-center border ${theme.border} ${theme.bg} relative`}>
                      <IoNotifications className={`w-5 h-5 ${theme.text}`} />
                      {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-semibold flex items-center justify-center text-white border border-white shadow-sm">
                          {notificationCount > 9 ? "9+" : notificationCount}
                        </span>
                      )}
                    </span>
                    Notifications
                  </button>
                  {showNotifications && (
                    <div data-notification-dropdown className="fixed bottom-20 left-4 right-4 sm:absolute sm:bottom-full sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 sm:mb-2 w-auto sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[60vh] overflow-hidden flex flex-col">
                      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                          aria-label="Close"
                        >
                          ×
                        </button>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-sm">
                            No notifications available
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="p-4 hover:bg-slate-50 transition cursor-pointer"
                                onClick={async () => {
                                  if (!notification.readAt) {
                                    try {
                                      await authedFetch("/api/employee/notifications", {
                                        method: "POST",
                                        body: JSON.stringify({ id: notification.id, action: "read" }),
                                      });
                                      // Refresh notifications
                                      const notifData = await authedFetch("/api/employee/notifications");
                                      setNotifications(Array.isArray(notifData) ? notifData : []);
                                      setNotificationCount(notifData.filter((n: any) => !n.readAt).length);
                                    } catch {
                                      // Ignore errors
                                    }
                                  }
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                    notification.type === "leave_approval" ? "bg-blue-500" :
                                    notification.type === "payroll" ? "bg-green-500" :
                                    notification.type === "document_update" ? "bg-purple-500" :
                                    "bg-indigo-500"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      {new Date(notification.sentAt).toLocaleString()}
                                    </p>
                                  </div>
                                  {!notification.readAt && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowEmployeeProfile(true)}
                  className={`flex flex-col items-center gap-1 flex-1 text-xs font-medium ${theme.text}`}
                >
                  <span className={`w-10 h-10 rounded-2xl grid place-items-center border ${theme.border} ${theme.bg}`}>
                    <FaUser className={`w-5 h-5 ${theme.text}`} />
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
                <div className="divide-y divide-slate-100">
                  <button
                    onClick={() => {
                      setShowAssignments(false);
                      setShowPayrollSection(false);
                      setShowEmployeeDocs(false);
                      setShowLeaveSection(false);
                      setShowMobileMenu(false);
                      scrollToFormTop();
                    }}
                    className={`w-full text-left px-4 py-4 flex items-center justify-between text-sm font-medium ${
                      !showAssignments && !showPayrollSection && !showEmployeeDocs && !showLeaveSection
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span>Work Form</span>
                    {!showAssignments && !showPayrollSection && !showEmployeeDocs && !showLeaveSection && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Active</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignments(true);
                      setShowPayrollSection(false);
                      setShowEmployeeDocs(false);
                      setShowLeaveSection(false);
                      setShowMobileMenu(false);
                      scrollToAssignments();
                    }}
                    className={`w-full text-left px-4 py-4 flex items-center justify-between text-sm font-medium ${
                      showAssignments ? "bg-indigo-50 text-indigo-700" : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span>Assigned Jobs</span>
                    {showAssignments && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Active</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignments(false);
                      setShowPayrollSection(true);
                      setShowEmployeeDocs(false);
                      setShowLeaveSection(false);
                      setShowMobileMenu(false);
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="w-full text-left px-4 py-4 flex items-center justify-between text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <span>Payroll</span>
                    {showPayrollSection && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Active</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignments(false);
                      setShowPayrollSection(false);
                      setShowEmployeeDocs(true);
                      setShowLeaveSection(false);
                      setShowMobileMenu(false);
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="w-full text-left px-4 py-4 flex items-center justify-between text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <span>Employee Documents</span>
                    {showEmployeeDocs && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Active</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignments(false);
                      setShowPayrollSection(false);
                      setShowEmployeeDocs(false);
                      setShowLeaveSection(true);
                      setShowMobileMenu(false);
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="w-full text-left px-4 py-4 flex items-center justify-between text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <span>Leave Request</span>
                    {showLeaveSection && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Active</span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignments(false);
                      setShowPayrollSection(false);
                      setShowEmployeeDocs(false);
                      setShowCompletedModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="w-full text-left px-4 py-4 flex items-center justify-between text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <span>View Submitted Jobs</span>
                    {showCompletedModal && (
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">Active</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Completed / Assigned jobs modal */}
          {showCompletedModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setShowCompletedModal(false)}
            >
              <div
                className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
                      <SiTicktick className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Employee Jobs</p>
                      <p className="text-sm font-semibold text-slate-900">Submitted</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCompletedModal(false)}
                    className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center"
                    aria-label="Close jobs modal"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">Submitted Jobs</h4>
                      <span className="text-xs text-slate-500">{completedOrders.length} total</span>
                    </div>
                    {completedOrders.length === 0 ? (
                      <p className="text-sm text-slate-500">No submitted jobs.</p>
                    ) : (
                      <div className="space-y-2">
                        {completedOrders.map((w) => {
                          const jobNumber = `WO-${w.id.slice(0, 8).toUpperCase()}`;
                          const d = new Date(w.orderDateTime);
                          const date = Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
                          return (
                            <div
                              key={w.id}
                              className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-emerald-800">{jobNumber}</p>
                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                  Submitted
                                </span>
                              </div>
                              <p className="text-slate-800">{w.customerName ?? "Customer"}</p>
                              <p className="text-xs text-slate-500">{w.locationAddress}</p>
                              <p className="text-xs text-slate-500 mt-1">Date: {date}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">Daily Work Schedule</h4>
                      <span className="text-xs text-slate-500">{dailySchedules.length} entries</span>
                    </div>
                    {dailySchedules.length === 0 ? (
                      <p className="text-sm text-slate-500">No schedule entries.</p>
                    ) : (
                      <div className="space-y-2">
                        {dailySchedules.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-800">
                                {Array.isArray(entry.employeeNames) && entry.employeeNames.length > 0
                                  ? entry.employeeNames.join(" & ")
                                  : "Schedule"}
                              </p>
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                                {entry.date}
                              </span>
                            </div>
                            <ul className="list-disc pl-5 text-xs text-slate-700 mt-1 space-y-1">
                              {entry.tasks.map((t, idx) => (
                                <li key={idx}>{t.text}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {employeeAuth && showPayrollSection && (
        <section className="max-w-4xl mx-auto mt-6 bg-white/95 rounded-2xl shadow-2xl p-5 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Payroll</h3>
              <p className="text-xs text-slate-500">View and sign your payroll statements.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPayrollSection(false)}
              className="hidden md:inline-flex p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              aria-label="Close payroll section"
            >
              <TiDelete className="w-5 h-5" />
            </button>
          </div>

          {/* Pending Payrolls */}
          {payrolls.filter((p) => p.status === "Generated" || p.status === "Pending Signature").length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Pending Signature</h4>
              {payrolls
                .filter((p) => p.status === "Generated" || p.status === "Pending Signature")
                .map((payroll) => (
                  <div
                    key={payroll.id}
                    className="border border-amber-200 rounded-xl p-4 bg-amber-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {new Date(payroll.period + "-01").toLocaleString("default", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-slate-600">Status: {payroll.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Net Pay</p>
                        <p className="text-xl font-bold text-emerald-600">
                          {payroll.netPay.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Payroll Date:</span>{" "}
                      {payroll.payrollDate
                        ? new Date(payroll.payrollDate).toLocaleDateString()
                        : "—"}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-slate-600">Base:</span>{" "}
                        <span className="font-medium">{payroll.baseSalary.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Allowances:</span>{" "}
                        <span className="font-medium">{payroll.allowances.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Deductions:</span>{" "}
                        <span className="font-medium">{payroll.deductions.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPayrollForSigning(payroll)}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                      >
                        Sign Payroll
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingPayrollId(payroll.id);
                          setRejectReason("");
                        }}
                        className="flex-1 px-4 py-2 border border-rose-200 text-rose-700 rounded-lg bg-rose-50 hover:bg-rose-100 text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Signed/Completed Payrolls */}
          {payrolls.filter((p) => p.status === "Signed" || p.status === "Completed" || p.status === "Rejected").length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900">Payroll History</h4>
              <div className="space-y-2">
                {payrolls
                  .filter((p) => p.status === "Signed" || p.status === "Completed" || p.status === "Rejected")
                  .sort((a, b) => b.period.localeCompare(a.period))
                  .map((payroll) => (
                    <div
                      key={payroll.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {new Date(payroll.period + "-01").toLocaleString("default", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        {payroll.signedAt && (
                          <p className="text-xs text-slate-500">
                            Signed: {new Date(payroll.signedAt).toLocaleDateString()}
                          </p>
                        )}
                        {payroll.status === "Rejected" && (
                          <p className="text-xs text-rose-600 mt-1">
                            Rejected{payroll.employeeRejectedAt && (
                              <> on {new Date(payroll.employeeRejectedAt).toLocaleDateString()}</>
                            )}
                            {payroll.employeeRejectionReason && ` – ${payroll.employeeRejectionReason}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Net Pay</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {payroll.netPay.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {payrolls.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No payroll records found</p>
            </div>
          )}

          {/* Advance Salary Requests Section */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Advance Salary Requests</h4>
                <p className="text-xs text-slate-500">
                  Request advance salary. Your request will be reviewed by admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Ensure payroll section is visible and assignments are hidden
                  setShowAssignments(false);
                  setShowPayrollSection(true);
                  setShowAdvanceSalaryForm((prev) => {
                    const newValue = !prev;
                    if (newValue && typeof window !== "undefined") {
                      // Scroll to the form after a brief delay to ensure it's rendered
                      setTimeout(() => {
                        const formElement = document.querySelector('[data-advance-salary-form]');
                        if (formElement) {
                          formElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }
                      }, 100);
                    }
                    return newValue;
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-500"
              >
                <span className="text-lg leading-none">+</span>
                <span>Request Advance Salary</span>
              </button>
            </div>

          {showAdvanceSalaryForm && showPayrollSection && (
            <div data-advance-salary-form className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Amount (AED)</label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Requested Date</label>
                  <input
                    type="date"
                    value={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Reason</label>
                <textarea
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Provide a clear reason for your advance salary request"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Minimum 5 characters required.</span>
                  <span>{advanceReason.length}/2000</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdvanceAmount("");
                    setAdvanceReason("");
                    setShowAdvanceSalaryForm(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white text-sm"
                  disabled={submittingAdvance}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
                      toast.error("Please enter a valid amount");
                      return;
                    }
                    if (!advanceReason || advanceReason.trim().length < 5) {
                      toast.error("Reason must be at least 5 characters");
                      return;
                    }
                    setSubmittingAdvance(true);
                    try {
                      const response = await authedFetch("/api/employee/advance-salary", {
                        method: "POST",
                        body: JSON.stringify({
                          amount: parseFloat(advanceAmount),
                          reason: advanceReason.trim(),
                          requestedDate: new Date().toISOString().slice(0, 10),
                        }),
                      });
                      toast.success("Advance salary request submitted successfully");
                      setAdvanceAmount("");
                      setAdvanceReason("");
                      setShowAdvanceSalaryForm(false);
                      // Refresh advance salary requests
                      const advances = await authedFetch("/api/employee/advance-salary");
                      setAdvanceSalaryRequests(Array.isArray(advances) ? advances : []);
                    } catch (error) {
                      toast.error((error as Error).message || "Failed to submit advance salary request");
                    } finally {
                      setSubmittingAdvance(false);
                    }
                  }}
                  disabled={submittingAdvance}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-semibold disabled:opacity-70"
                >
                  {submittingAdvance ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">History</h4>
            </div>
            {advanceSalaryRequests.length === 0 ? (
              <p className="text-sm text-slate-500">
                No advance salary requests yet. Use the <span className="font-semibold">+ Request</span> button
                above to submit your first request.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {advanceSalaryRequests.map((advance) => {
                  const statusClasses =
                    advance.status === "Approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : advance.status === "Rejected"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700";

                  return (
                    <div
                      key={advance.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            {advance.amount.toFixed(2)} AED
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusClasses}`}>
                            {advance.status}
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2">{advance.reason}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Requested: {advance.requestedDate}
                          {advance.approvedAt && ` • Approved: ${new Date(advance.approvedAt).toLocaleDateString()}`}
                          {advance.rejectedAt && ` • Rejected: ${new Date(advance.rejectedAt).toLocaleDateString()}`}
                        </p>
                        {advance.approvalMessage && (
                          <p className="text-xs text-emerald-600 mt-1">Message: {advance.approvalMessage}</p>
                        )}
                        {advance.rejectionReason && (
                          <p className="text-xs text-rose-600 mt-1">Reason: {advance.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </section>
      )}

      {employeeAuth && showLeaveSection && (
        <section className="max-w-4xl mx-auto mt-6 bg-white/95 rounded-2xl shadow-2xl p-5 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Leave Requests</h3>
              <p className="text-xs text-slate-500">
                Submit and track your leave requests. Approved leave will be visible to your admin.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                <span className="font-semibold">Employee:</span> {employeeAuth.name} •{" "}
                <span className="font-semibold">BU:</span> {employeeAuth.businessUnit}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowOvertimeForm((prev) => !prev);
                  if (!showOvertimeForm) {
                    setShowLeaveForm(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-500"
              >
                <FcOvertime className="w-5 h-5" />
                <span>Overtime</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveForm((prev) => !prev);
                  if (!showLeaveForm) {
                    setShowOvertimeForm(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-emerald-500"
              >
                <span className="text-lg leading-none">+</span>
                <span>Request</span>
              </button>
              <button
                type="button"
                onClick={scrollToAssignments}
                className="hidden md:inline-flex p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                aria-label="Close leave request section"
              >
                <TiDelete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showLeaveForm && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
              <div className={`grid grid-cols-1 ${leaveType === "Annual" ? "md:grid-cols-2" : "md:grid-cols-3"} gap-3`}>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Leave type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => {
                      const newType = e.target.value as LeaveType;
                      setLeaveType(newType);
                      if (newType !== "SickWithCertificate") {
                        setLeaveCertificateFile(null);
                      }
                      if (newType !== "Annual") {
                        setLeaveDocuments([]);
                      }
                      // Auto-set unit to FullDay when Annual is selected
                      if (newType === "Annual") {
                        setLeaveUnit("FullDay");
                        setLeaveStartTime("");
                        setLeaveEndTime("");
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Annual">Annual / Vacation</option>
                    <option value="SickWithCertificate">Sick with certificate</option>
                    <option value="SickWithoutCertificate">Sick without certificate</option>
                  </select>
                </div>
                {leaveType !== "Annual" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Unit</label>
                    <select
                      value={leaveUnit}
                      onChange={(e) => setLeaveUnit(e.target.value as LeaveUnit)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="FullDay">Full day</option>
                      <option value="HalfDay">Half day</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Start date</label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {leaveUnit === "FullDay" ? "End date (optional)" : "End date"}
                  </label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                {leaveUnit === "HalfDay" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Start time</label>
                      <input
                        type="time"
                        value={leaveStartTime}
                        onChange={(e) => setLeaveStartTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">End time</label>
                      <input
                        type="time"
                        value={leaveEndTime}
                        onChange={(e) => setLeaveEndTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Reason</label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Provide a clear reason for your leave request"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Minimum 5 characters. Backdated leave is only allowed for sick leave.</span>
                  <span>{leaveReason.length}/2000</span>
                </div>
              </div>

              {leaveType === "SickWithCertificate" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Medical Certificate <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setLeaveCertificateFile(null);
                        return;
                      }
                      // Check file size (max 10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error("File size must be less than 10MB");
                        e.target.value = "";
                        setLeaveCertificateFile(null);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          setLeaveCertificateFile(reader.result);
                        }
                      };
                      reader.onerror = () => {
                        toast.error("Failed to read file");
                        e.target.value = "";
                        setLeaveCertificateFile(null);
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {leaveCertificateFile && (
                    <p className="text-xs text-emerald-600">Certificate file ready to upload</p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Upload a medical certificate (PDF, JPG, PNG, DOC, DOCX). Maximum file size: 10MB.
                  </p>
                </div>
              )}

              {leaveType === "Annual" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Documents / Tickets (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) {
                        return;
                      }
                      
                      const newDocuments: Array<{ fileName: string; fileData: string }> = [];
                      let filesProcessed = 0;
                      let hasError = false;

                      files.forEach((file) => {
                        // Check file size (max 10MB)
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error(`File "${file.name}" exceeds 10MB limit`);
                          hasError = true;
                          return;
                        }

                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            newDocuments.push({
                              fileName: file.name,
                              fileData: reader.result,
                            });
                          }
                          filesProcessed++;
                          if (filesProcessed === files.length && !hasError) {
                            setLeaveDocuments((prev) => [...prev, ...newDocuments]);
                          }
                        };
                        reader.onerror = () => {
                          toast.error(`Failed to read file: ${file.name}`);
                          hasError = true;
                          filesProcessed++;
                          if (filesProcessed === files.length) {
                            if (newDocuments.length > 0) {
                              setLeaveDocuments((prev) => [...prev, ...newDocuments]);
                            }
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                      // Reset input to allow selecting the same file again
                      e.target.value = "";
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {leaveDocuments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600">
                        {leaveDocuments.length} document(s) ready to upload:
                      </p>
                      <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
                        {leaveDocuments.map((doc, idx) => (
                          <li key={idx} className="flex items-center justify-between">
                            <span>{doc.fileName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setLeaveDocuments((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-rose-600 hover:text-rose-800 ml-2"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Upload tickets, hotel bookings, or other supporting documents (PDF, JPG, PNG, DOC, DOCX). Maximum file size: 10MB per file.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetLeaveForm();
                    setShowLeaveForm(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white text-sm"
                  disabled={submittingLeave}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitLeave}
                  disabled={submittingLeave}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-semibold disabled:opacity-70"
                >
                  {submittingLeave ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </div>
          )}

          {showOvertimeForm && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={overtimeDate}
                    onChange={(e) => setOvertimeDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Start Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={overtimeStartTime}
                    onChange={(e) => setOvertimeStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">End Time <span className="text-rose-500">*</span></label>
                  <input
                    type="time"
                    value={overtimeEndTime}
                    onChange={(e) => setOvertimeEndTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {overtimeStartTime && overtimeEndTime && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                  <p className="text-xs font-semibold text-blue-700">
                    Total Hours: <span className="text-blue-900">{calculateOvertimeHours(overtimeStartTime, overtimeEndTime).toFixed(2)}</span>
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Project / Task (Optional)</label>
                <input
                  type="text"
                  value={overtimeProject}
                  onChange={(e) => setOvertimeProject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Enter project or task name"
                  maxLength={200}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description <span className="text-rose-500">*</span></label>
                <textarea
                  value={overtimeDescription}
                  onChange={(e) => setOvertimeDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Describe the work performed during overtime"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Minimum 5 characters. Maximum 2000 characters.</span>
                  <span>{overtimeDescription.length}/2000</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetOvertimeForm();
                    setShowOvertimeForm(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white text-sm"
                  disabled={submittingOvertime}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitOvertime}
                  disabled={submittingOvertime}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-semibold disabled:opacity-70"
                >
                  {submittingOvertime ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">History</h4>
              {leaveLoading && (
                <span className="text-xs text-slate-500">Loading leave requests...</span>
              )}
            </div>
            {leaveRequests.length === 0 && !leaveLoading ? (
              <p className="text-sm text-slate-500">
                No leave requests yet. Use the <span className="font-semibold">+ Request</span> button
                above to submit your first request.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {leaveRequests.map((leave) => {
                  const statusClasses =
                    leave.status === "Approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : leave.status === "Rejected"
                      ? "bg-rose-100 text-rose-700"
                      : leave.status === "Cancelled"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-amber-100 text-amber-700";

                  const dateRange =
                    leave.startDate && leave.endDate && leave.startDate !== leave.endDate
                      ? `${leave.startDate} → ${leave.endDate}`
                      : leave.startDate;

                  const timeRange =
                    leave.startTime && leave.endTime
                      ? `${leave.startTime} - ${leave.endTime}`
                      : undefined;

                  return (
                    <div
                      key={leave.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold uppercase text-slate-500">
                            {formatLeaveType(leave.type)} • {leave.unit}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClasses}`}
                          >
                            {leave.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <span className="font-medium">Dates:</span> {dateRange}
                          {timeRange && <> • {timeRange}</>}
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          <span className="font-medium">Reason:</span> {leave.reason}
                        </p>
                        {leave.status === "Rejected" && leave.rejectionReason && (
                          <p className="text-xs text-rose-600">
                            <span className="font-medium">Rejected:</span> {leave.rejectionReason}
                          </p>
                        )}
                        {leave.status === "Approved" && leave.approvalMessage && (
                          <p className="text-xs text-emerald-600">
                            <span className="font-medium">Message:</span> {leave.approvalMessage}
                          </p>
                        )}
                        {leave.certificateUrl && (
                          <p className="text-xs text-slate-600">
                            <span className="font-medium">Certificate:</span>{" "}
                            <a
                              href={leave.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              View certificate
                            </a>
                          </p>
                        )}
                        {leave.employeeDocuments && leave.employeeDocuments.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-600">Documents:</p>
                            <div className="flex flex-wrap gap-1">
                              {leave.employeeDocuments.map((doc, idx) => (
                                <a
                                  key={idx}
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 rounded text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                >
                                  {doc.fileName}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {leave.status === "Approved" && leave.approvalDocuments && leave.approvalDocuments.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-600">Documents:</p>
                            <div className="flex flex-wrap gap-1">
                              {leave.approvalDocuments.map((doc, idx) => (
                                <a
                                  key={idx}
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                >
                                  {doc.fileName}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {leave.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleCancelLeave(leave.id)}
                            className="px-3 py-1 rounded-full border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {overtimeRequests.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Overtime History</h4>
                {overtimeLoading && (
                  <span className="text-xs text-slate-500">Loading overtime requests...</span>
                )}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {overtimeRequests.map((overtime) => {
                  const statusClasses =
                    overtime.status === "Approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : overtime.status === "Rejected"
                      ? "bg-rose-100 text-rose-700"
                      : overtime.status === "Cancelled"
                      ? "bg-slate-100 text-slate-700"
                      : "bg-amber-100 text-amber-700";

                  return (
                    <div
                      key={overtime.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold uppercase text-slate-500">
                            {overtime.date} • {overtime.hours.toFixed(2)} hours
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClasses}`}
                          >
                            {overtime.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <span className="font-medium">Time:</span> {overtime.startTime} - {overtime.endTime}
                        </p>
                        {overtime.project && (
                          <p className="text-xs text-slate-600">
                            <span className="font-medium">Project:</span> {overtime.project}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2">
                          <span className="font-medium">Description:</span> {overtime.description}
                        </p>
                        {overtime.status === "Rejected" && overtime.rejectionReason && (
                          <p className="text-xs text-rose-600">
                            <span className="font-medium">Rejected:</span> {overtime.rejectionReason}
                          </p>
                        )}
                        {overtime.status === "Approved" && overtime.approvalMessage && (
                          <p className="text-xs text-emerald-600">
                            <span className="font-medium">Message:</span> {overtime.approvalMessage}
                          </p>
                        )}
                      </div>
                      {overtime.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => handleCancelOvertime(overtime.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {employeeAuth && showRatings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowRatings(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaFaceGrinStars className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Your Ratings</h3>
                  <p className="text-xs text-slate-500">
                    Overall score:{" "}
                    {ratingStats.averageScore
                      ? `${ratingStats.averageScore.toFixed(1)} / 5 (${ratingStats.count} rating${
                          ratingStats.count === 1 ? "" : "s"
                        })`
                      : "No ratings yet"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRatings(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label="Close ratings"
              >
                ×
              </button>
            </div>

            {loadingRatings && (
              <p className="text-sm text-slate-500 mb-2">Loading ratings...</p>
            )}

            {ratingDetails.length === 0 && !loadingRatings && (
              <p className="text-sm text-slate-500">
                You don't have any customer ratings yet. Once customers submit ratings for your
                completed jobs, they will appear here.
              </p>
            )}

            {ratingDetails.length > 0 && (
              <div className="divide-y divide-slate-100">
                {ratingDetails.map((r) => (
                  <div key={r.id} className="py-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-amber-500 text-sm">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <span key={idx}>{idx < r.score ? "★" : "☆"}</span>
                        ))}
                      </div>
                      {r.createdAt && (
                        <span className="text-[11px] text-slate-400">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {r.comment && (
                      <p className="text-sm text-slate-700 whitespace-pre-line">{r.comment}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Work order ID: <span className="font-mono">{r.workOrderId}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {employeeAuth && showEmployeeDocs && (
        <section className="max-w-4xl mx-auto mt-6 bg-white/95 rounded-2xl shadow-2xl p-5 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Employee Documents</h3>
              <p className="text-xs text-slate-500">
                View documents uploaded by your admin. You can download them but not edit.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                <span className="font-semibold">Name:</span> {employeeAuth.name}{" "}
                {employeeAuth.role && (
                  <>
                    • <span className="font-semibold">Role:</span> {employeeAuth.role}
                  </>
                )}
                {employeeAuth.status && (
                  <>
                    {" "}
                    • <span className="font-semibold">Status:</span> {employeeAuth.status}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEmployeeDocs(false)}
              className="hidden md:inline-flex p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              aria-label="Close employee documents section"
            >
              <TiDelete className="w-5 h-5" />
            </button>
          </div>

          {employeeDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No employee documents available.</p>
              <p className="text-xs mt-1">If you believe documents should be here, please contact your admin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employeeDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{doc.fileName}</p>
                    <p className="text-xs text-slate-600">
                      {doc.docType && <span className="mr-2">Type: {doc.docType}</span>}
                      <span className="mr-2">
                        Uploaded:{" "}
                        {Number.isNaN(new Date(doc.uploadedAt).getTime())
                          ? "—"
                          : new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                      {doc.expiryDate && (
                        <span>
                          Expiry:{" "}
                          {Number.isNaN(new Date(doc.expiryDate).getTime())
                            ? "—"
                            : new Date(doc.expiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.fileType && (
                      <span className="inline-flex items-center rounded-full bg-slate-200 text-slate-700 px-2 py-0.5 text-[11px]">
                        {doc.fileType}
                      </span>
                    )}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-slate-700"
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {employeeAuth && (
        <PayrollSignatureModal
          isOpen={selectedPayrollForSigning !== null}
          onClose={() => setSelectedPayrollForSigning(null)}
          payroll={selectedPayrollForSigning}
          onSuccess={() => {
            loadPayrolls();
            setSelectedPayrollForSigning(null);
          }}
        />
      )}

      {employeeAuth && rejectingPayrollId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/70 backdrop-blur-sm"
          onClick={() => {
            setRejectingPayrollId(null);
            setRejectReason("");
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Reject Payroll</p>
                <p className="text-sm font-semibold text-slate-900">
                  Provide a reason for rejection
                </p>
              </div>
              <button
                onClick={() => {
                  setRejectingPayrollId(null);
                  setRejectReason("");
                }}
                className="rounded-full bg-slate-100 text-slate-600 w-9 h-9 grid place-items-center"
                aria-label="Close reject payroll modal"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                This will notify your admin that the payroll needs correction. Explain what is
                incorrect so they can adjust and reissue it.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Describe the issue with this payroll..."
              />
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingPayrollId(null);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectPayroll}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500 text-sm font-semibold"
                >
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {employeeAuth && showAssignments && (
        <button
          type="button"
          onClick={() => {
            setShowAssignments(false);
            setShowPayrollSection(true);
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="hidden lg:inline-flex fixed bottom-24 right-6 z-40 items-center justify-center w-12 h-12 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-500/40 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300"
          title="View Payroll"
        >
          <HiDocumentCurrencyDollar className="w-6 h-6" />
        </button>
      )}
    </main>
  );
}
