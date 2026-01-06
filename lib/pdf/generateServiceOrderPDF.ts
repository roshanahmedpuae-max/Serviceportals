import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import type { ServiceOrderFormData } from "../validation";
import WorkOrderPDF from "../pdf-template";

export interface ServiceOrderPdfResult {
  buffer: Buffer;
  filename: string;
}

/**
 * Deep sanitize data to ensure all objects are plain objects with no undefined properties.
 * React-PDF uses hasOwnProperty internally and fails on undefined values.
 */
function deepSanitizeForReactPDF(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.map(item => deepSanitizeForReactPDF(item));
  }

  if (typeof data === 'object') {
    // Create a plain object to avoid class instances or proxies
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        // Skip undefined values - React-PDF can't handle them
        if (value !== undefined) {
          sanitized[key] = deepSanitizeForReactPDF(value);
        } else {
          // Convert undefined to null or empty string based on type
          sanitized[key] = null;
        }
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Core PDF generation for service orders.
 *
 * - Accepts validated & normalized ServiceOrderFormData
 * - Deep sanitizes data to ensure React-PDF compatibility
 * - Renders the React-PDF document to a Buffer
 * - Validates the resulting Buffer to prevent empty/corrupted PDFs
 * - Logs minimal debug info (buffer size, runtime, payload keys)
 *
 * Errors are not caught here – callers are responsible for handling them.
 */
export async function generateServiceOrderPDF(
  data: ServiceOrderFormData,
  options?: { requestId?: string }
): Promise<ServiceOrderPdfResult> {
  const requestId = options?.requestId || "pdf-core";
  const runtime = process.env.NEXT_RUNTIME || "unknown";

  // Lightweight debug logging – keys only, no values to avoid leaking data
  try {
    const dataKeys = Object.keys(data || {});
    console.log(`[${requestId}] [generateServiceOrderPDF] Starting core PDF generation`, {
      runtime,
      dataKeys,
    });
  } catch {
    // Best-effort logging only
  }

  // Deep sanitize data to ensure React-PDF compatibility (no undefined properties)
  const sanitizedData = deepSanitizeForReactPDF(data) as ServiceOrderFormData;

  // Render the React-PDF document to a Buffer
  const pdfBuffer = await renderToBuffer(
    React.createElement(WorkOrderPDF, { data: sanitizedData }) as React.ReactElement<DocumentProps>
  );

  const bufferLength = (pdfBuffer as any)?.length ?? 0;

  // Fail fast if the buffer looks invalid
  if (!pdfBuffer || bufferLength < 1000) {
    throw new Error("Generated PDF buffer is empty or corrupted");
  }

  try {
    console.log(`[${requestId}] [generateServiceOrderPDF] PDF generated`, {
      bufferSize: bufferLength,
      runtime,
    });
  } catch {
    // Ignore logging failures
  }

  // Build a safe filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = (data.requesterName || "WorkOrder")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const filename = `WorkOrder_${safeName}_${timestamp}.pdf`;

  return {
    buffer: pdfBuffer as Buffer,
    filename,
  };
}


