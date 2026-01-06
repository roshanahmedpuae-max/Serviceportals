import { NextRequest, NextResponse } from "next/server";
import { serviceOrderSchema } from "@/lib/validation";
import { mapFormDataToServiceOrderData } from "@/lib/pdf-mappers";
import { generateServiceOrderPDF } from "@/lib/pdf/generateServiceOrderPDF";

// Ensure this route runs in the Node.js runtime so that Buffer and
// other Node-specific APIs used by @react-pdf/renderer work correctly.
// Without this, the route may default to the Edge runtime where Buffer
// is not available, causing PDF generation to fail and breaking preview/download.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Generate request ID for tracking
  const requestId = `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const isDev = process.env.NODE_ENV !== 'production';
  
  try {
    // Parse the request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "validation",
            message: "Invalid request format. Please check your form data.",
            details: undefined,
          },
          requestId: isDev ? requestId : undefined,
        },
        { status: 400 }
      );
    }

    // Determine portal/portalType from incoming body
    const portalType =
      (body?.serviceType as "printers-uae" | "g3-facility" | "it-service") || "printers-uae";

    // Normalize data BEFORE validation
    const normalizedData = mapFormDataToServiceOrderData(body, portalType);

    // Lightweight debug logging (keys only)
    if (isDev) {
      try {
        console.log(`[${requestId}] PDF generation request received`, {
          runtime: process.env.NEXT_RUNTIME || "unknown",
          serviceType: body?.serviceType,
          dataKeys: Object.keys(normalizedData || {}),
        });
      } catch {
        // ignore logging failures
      }
    }

    // Validate the normalized form data
    const validationResult = serviceOrderSchema.safeParse(normalizedData);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      console.error(`[${requestId}] Validation errors`, {
        fields: Object.keys(errors.fieldErrors || {}),
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            type: "validation",
            message: "Please fix the highlighted errors in the form.",
            details: errors.fieldErrors,
          },
          requestId: isDev ? requestId : undefined,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Generate PDF using shared core generator
    let pdfBuffer: Buffer;
    let filename: string;
    try {
      console.log(`[${requestId}] Starting PDF generation via shared generator...`);
      const result = await generateServiceOrderPDF(data, { requestId });
      pdfBuffer = result.buffer;
      filename = result.filename;
      console.log(
        `[${requestId}] PDF generated successfully, size: ${pdfBuffer.length} bytes, filename: ${filename}`
      );

      // Fail fast if buffer somehow invalid at this stage
      if (!pdfBuffer || pdfBuffer.length < 1000) {
        throw new Error("Generated PDF buffer is empty or corrupted");
      }
    } catch (pdfError: any) {
      console.error(`[${requestId}] PDF generation error:`, {
        type: pdfError?.error || "PDF_GENERATION_FAILED",
        message: pdfError?.message || String(pdfError),
        stack: pdfError?.details || pdfError?.stack,
      });
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "pdf",
            message: pdfError?.message || "Failed to generate PDF preview.",
            details: isDev ? { rawError: String(pdfError?.error || "PDF_GENERATION_FAILED") } : undefined,
          },
          requestId: isDev ? requestId : undefined,
        },
        { status: 500 }
      );
    }

    console.log(`[${requestId}] PDF generation completed successfully`);

    // Convert buffer to base64 for client consumption
    const base64 = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      message: "PDF generated successfully!",
      pdf: {
        base64,
        filename,
        mimeType: "application/pdf",
      },
      requestId: isDev ? requestId : undefined,
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error generating PDF`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: {
          type: "internal",
          message: errorMessage,
          details: isDev && error instanceof Error ? { stack: error.stack } : undefined,
        },
        requestId: isDev ? requestId : undefined,
      },
      { status: 500 }
    );
  }
}

