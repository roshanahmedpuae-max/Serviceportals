import { ServiceOrderFormData } from "./validation";

/**
 * Portal-specific data mappers
 * These functions normalize form data from different portals into a consistent ServiceOrderFormData structure
 */

/**
 * Sanitize and normalize workPhotos array
 */
function sanitizeWorkPhotos(workPhotos: any[] | undefined | null): Array<{ id: string; beforePhoto: string; afterPhoto: string }> {
  if (!Array.isArray(workPhotos)) {
    return [];
  }

  return workPhotos
    .filter((pair): pair is { id?: string; beforePhoto?: string; afterPhoto?: string } => 
      pair !== null && 
      pair !== undefined && 
      typeof pair === 'object'
    )
    .filter(pair => pair.beforePhoto || pair.afterPhoto) // Only include pairs with at least one photo
    .map((pair, index) => ({
      id: pair.id || `photo-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
      beforePhoto: pair.beforePhoto || "",
      afterPhoto: pair.afterPhoto || "",
    }));
}

/**
 * Map Printers UAE form data to ServiceOrderFormData
 */
export function mapPrintersFormToServiceOrderData(data: any): ServiceOrderFormData {
  return {
    requesterName: data.requesterName || "",
    locationAddress: data.locationAddress || "",
    phone: data.phone || "",
    email: data.email || "",
    customerType: data.customerType || "Service and Repair",
    priorityLevel: data.priorityLevel || "Normal",
    orderDateTime: data.orderDateTime || new Date().toISOString().slice(0, 16),
    quotationReferenceNumber: data.quotationReferenceNumber || "",
    workAssignedTo: data.workAssignedTo || "",
    workBilledTo: data.workBilledTo || "",
    requestDescription: data.requestDescription || "",
    incompleteWorkExplanation: data.incompleteWorkExplanation || "",
    countReportPhoto: data.countReportPhoto || "",
    workPhotos: sanitizeWorkPhotos(data.workPhotos),
    workCompletedBy: data.workCompletedBy || "",
    completionDate: data.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: data.technicianSignature || "",
    customerApprovalName: data.customerApprovalName || "",
    customerSignature: data.customerSignature || "",
    customerApprovalDate: data.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: data.paymentMethod || "",
  };
}

/**
 * Map G3 Facility form data to ServiceOrderFormData
 * G3 Facility forms typically include multiple workPhotos pairs
 */
export function mapG3FormToServiceOrderData(data: any): ServiceOrderFormData {
  return {
    requesterName: data.requesterName || "",
    locationAddress: data.locationAddress || "",
    phone: data.phone || "",
    email: data.email || "",
    customerType: data.customerType || "General Maintenance",
    priorityLevel: data.priorityLevel || "Normal",
    orderDateTime: data.orderDateTime || new Date().toISOString().slice(0, 16),
    quotationReferenceNumber: data.quotationReferenceNumber || "",
    workAssignedTo: data.workAssignedTo || "",
    workBilledTo: data.workBilledTo || "",
    requestDescription: data.requestDescription || "",
    incompleteWorkExplanation: data.incompleteWorkExplanation || "",
    countReportPhoto: data.countReportPhoto || "",
    workPhotos: sanitizeWorkPhotos(data.workPhotos), // G3 forms use MultiplePhotoAttachment
    workCompletedBy: data.workCompletedBy || "",
    completionDate: data.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: data.technicianSignature || "",
    customerApprovalName: data.customerApprovalName || "",
    customerSignature: data.customerSignature || "",
    customerApprovalDate: data.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: data.paymentMethod || "",
  };
}

/**
 * Map IT Service form data to ServiceOrderFormData
 */
export function mapITFormToServiceOrderData(data: any): ServiceOrderFormData {
  return {
    requesterName: data.requesterName || "",
    locationAddress: data.locationAddress || "",
    phone: data.phone || "",
    email: data.email || "",
    customerType: data.customerType || "Hardware Repair",
    priorityLevel: data.priorityLevel || "Normal",
    orderDateTime: data.orderDateTime || new Date().toISOString().slice(0, 16),
    quotationReferenceNumber: data.quotationReferenceNumber || "",
    workAssignedTo: data.workAssignedTo || "",
    workBilledTo: data.workBilledTo || "",
    requestDescription: data.requestDescription || "",
    incompleteWorkExplanation: data.incompleteWorkExplanation || "",
    countReportPhoto: data.countReportPhoto || "",
    workPhotos: sanitizeWorkPhotos(data.workPhotos),
    workCompletedBy: data.workCompletedBy || "",
    completionDate: data.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: data.technicianSignature || "",
    customerApprovalName: data.customerApprovalName || "",
    customerSignature: data.customerSignature || "",
    customerApprovalDate: data.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: data.paymentMethod || "",
  };
}

/**
 * Universal mapper that detects portal type and applies appropriate mapping
 */
export function mapFormDataToServiceOrderData(data: any, portalType?: "printers-uae" | "g3-facility" | "it-service"): ServiceOrderFormData {
  // Auto-detect portal type if not provided
  if (!portalType) {
    const serviceType = data.serviceType;
    if (serviceType === "g3-facility") {
      portalType = "g3-facility";
    } else if (serviceType === "it-service") {
      portalType = "it-service";
    } else {
      portalType = "printers-uae"; // Default
    }
  }

  switch (portalType) {
    case "g3-facility":
      return mapG3FormToServiceOrderData(data);
    case "it-service":
      return mapITFormToServiceOrderData(data);
    case "printers-uae":
    default:
      return mapPrintersFormToServiceOrderData(data);
  }
}

