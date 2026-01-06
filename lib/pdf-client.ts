/**
 * Client-side PDF utilities
 * Shared functions for handling PDF downloads and conversions
 */

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string = "application/pdf"): Blob {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    throw new Error(`Failed to convert base64 to Blob: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Download PDF from base64 string
 */
export function downloadPdfFromBase64(base64: string, filename: string): void {
  try {
    const blob = base64ToBlob(base64);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Parse API error response to extract user-friendly message
 */
export function parseApiError(response: any): { message: string; details?: any } {
  if (!response) {
    return { message: "An unknown error occurred" };
  }

  // New standardized shape: { success: false, error: { type, message, details } }
  if (response.error && typeof response.error === "object" && !Array.isArray(response.error)) {
    const err = response.error as { type?: string; message?: string; details?: any };

    // Prefer explicit message, fall back to type
    let message = err.message;
    if (!message && err.type) {
      if (err.type === "validation") {
        message = "Please fix the highlighted errors in the form.";
      } else if (err.type === "pdf") {
        message = "There was a problem generating the PDF.";
      } else {
        message = "An internal error occurred. Please try again.";
      }
    }

    // As a last resort, use generic message
    if (!message) {
      message = "An error occurred";
    }

    return {
      message,
      details: err.details,
    };
  }

  // Prefer detailed message if available
  if (response.message) {
    return {
      message: response.message,
      details: response.details,
    };
  }

  // Fall back to error field
  if (response.error) {
    return {
      message: typeof response.error === 'string' ? response.error : "An error occurred",
      details: response.details,
    };
  }

  // Handle validation errors
  if (response.details && typeof response.details === 'object') {
    const fieldErrors = Object.entries(response.details)
      .map(([field, messages]) => {
        const msgArray = Array.isArray(messages) ? messages : [messages];
        return `${field}: ${msgArray.join(", ")}`;
      })
      .join("; ");
    
    return {
      message: fieldErrors || "Validation errors occurred",
      details: response.details,
    };
  }

  return { message: "An unknown error occurred" };
}

