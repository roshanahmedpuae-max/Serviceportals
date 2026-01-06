import { ServiceOrderFormData } from "./validation";
import { mapFormDataToServiceOrderData } from "./pdf-mappers";
import { generateServiceOrderPDF } from "./pdf/generateServiceOrderPDF";

/**
 * Centralized PDF generation service
 * This service handles all PDF generation logic with robust error handling and data sanitization
 */

export interface PdfGenerationResult {
  buffer: Buffer;
  filename: string;
  base64: string;
}

export interface PdfGenerationError {
  error: string;
  message: string;
  details?: string;
}

/**
 * Sanitize and validate ServiceOrderFormData
 */
function sanitizeServiceOrderData(data: ServiceOrderFormData | any, portalType?: "printers-uae" | "g3-facility" | "it-service"): ServiceOrderFormData {
  // Use mapper to normalize data
  const normalized = mapFormDataToServiceOrderData(data, portalType);

  // Ensure all required fields have safe defaults
  return {
    requesterName: normalized.requesterName || "",
    locationAddress: normalized.locationAddress || "",
    phone: normalized.phone || "",
    email: normalized.email || "",
    customerType: normalized.customerType || "Service and Repair",
    priorityLevel: normalized.priorityLevel || "Normal",
    orderDateTime: normalized.orderDateTime || new Date().toISOString().slice(0, 16),
    quotationReferenceNumber: normalized.quotationReferenceNumber || "",
    workAssignedTo: normalized.workAssignedTo || "",
    workBilledTo: normalized.workBilledTo || "",
    requestDescription: normalized.requestDescription || "",
    incompleteWorkExplanation: normalized.incompleteWorkExplanation || "",
    countReportPhoto: normalized.countReportPhoto || "",
    workPhotos: Array.isArray(normalized.workPhotos) 
      ? normalized.workPhotos.filter(pair => 
          pair && 
          typeof pair === 'object' && 
          (pair.beforePhoto || pair.afterPhoto)
        )
      : [],
    workCompletedBy: normalized.workCompletedBy || "",
    completionDate: normalized.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: normalized.technicianSignature || "",
    customerApprovalName: normalized.customerApprovalName || "",
    customerSignature: normalized.customerSignature || "",
    customerApprovalDate: normalized.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: normalized.paymentMethod || "",
  };
}

/**
 * Validate image data size (prevent overly large base64 strings)
 */
function validateImageSize(base64String: string, maxSizeMB: number = 5): boolean {
  if (!base64String) return true; // Empty is fine
  
  // Approximate size: base64 is ~33% larger than binary
  const sizeInBytes = (base64String.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  return sizeInMB <= maxSizeMB;
}

/**
 * Generate PDF buffer from ServiceOrderFormData
 * 
 * @param data - Form data (will be sanitized and normalized)
 * @param portalType - Optional portal type for portal-specific normalization
 * @returns PDF buffer, filename, and base64 string
 * @throws PdfGenerationError if generation fails
 */
export async function generateWorkOrderPdfBuffer(
  data: ServiceOrderFormData | any,
  portalType?: "printers-uae" | "g3-facility" | "it-service"
): Promise<PdfGenerationResult> {
  try {
    // Sanitize and normalize data
    const sanitizedData = sanitizeServiceOrderData(data, portalType);

    // Validate image sizes (optional but recommended)
    if (sanitizedData.technicianSignature && !validateImageSize(sanitizedData.technicianSignature)) {
      console.warn("Technician signature image exceeds recommended size (5MB)");
    }
    if (sanitizedData.customerSignature && !validateImageSize(sanitizedData.customerSignature)) {
      console.warn("Customer signature image exceeds recommended size (5MB)");
    }
    if (sanitizedData.countReportPhoto && !validateImageSize(sanitizedData.countReportPhoto)) {
      console.warn("Count report photo exceeds recommended size (5MB)");
    }

    // Generate PDF buffer & filename using shared core generator
    const { buffer: pdfBuffer, filename } = await generateServiceOrderPDF(sanitizedData, {
      requestId: "pdf-service",
    });

    // Convert to base64 for existing callers
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    return {
      buffer: pdfBuffer,
      filename,
      base64: pdfBase64,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;

    throw {
      error: "PDF_GENERATION_FAILED",
      message: `Failed to generate PDF: ${errorMessage}`,
      details: errorStack,
    } as PdfGenerationError;
  }
}

