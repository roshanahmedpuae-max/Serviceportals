"use client";

import { useState, useEffect } from "react";
import { ServiceOrderFormData } from "@/lib/validation";
import { base64ToBlob, downloadPdfFromBase64, parseApiError } from "@/lib/pdf-client";
import toast from "react-hot-toast";
import { BsFillTelephoneFill } from "react-icons/bs";
import { FaMobile } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import { FaLocationDot } from "react-icons/fa6";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: ServiceOrderFormData | null;
  serviceType?: "printers-uae" | "g3-facility" | "it-service";
}

// Service type configurations
const SERVICE_CONFIG = {
  "printers-uae": {
    name: "Printers UAE",
    shortName: "P",
    gradient: "from-blue-600 to-purple-600",
    hoverGradient: "hover:from-blue-700 hover:to-purple-700",
    sectionColor: "bg-blue-600",
    tel: "(+971)-2-675",
    mobile: "(+971)-54-387-0181",
    email: "info@printersuae.com",
    locations: ["Business Bay, Dubai", "Mussafah & Sila, Abu Dhabi"],
  },
  "g3-facility": {
    name: "G3 Facility",
    shortName: "G3",
    gradient: "from-emerald-600 to-teal-600",
    hoverGradient: "hover:from-emerald-700 hover:to-teal-700",
    sectionColor: "bg-emerald-600",
    tel: "(+971)-2-675",
    mobile: "(+971)-54-387-0181",
    email: "info@g3facility.com",
    locations: ["Business Bay, Dubai", "Mussafah & Sila, Abu Dhabi"],
  },
  "it-service": {
    name: "IT Service",
    shortName: "IT",
    gradient: "from-purple-600 to-violet-600",
    hoverGradient: "hover:from-purple-700 hover:to-violet-700",
    sectionColor: "bg-purple-600",
    tel: "(+971)-2-675",
    mobile: "(+971)-54-387-0181",
    email: "info@itservice.com",
    locations: ["Business Bay, Dubai", "Mussafah & Sila, Abu Dhabi"],
  },
};

// Format date for display
function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format datetime for display
function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return "N/A";
  const date = new Date(dateTimeString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get priority badge color
function getPriorityColor(priority: string) {
  switch (priority) {
    case "High":
      return "bg-amber-500";
    case "Urgent":
      return "bg-red-500";
    default:
      return "bg-emerald-500";
  }
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  formData,
  serviceType = "printers-uae",
}: PDFPreviewModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  
  const config = SERVICE_CONFIG[serviceType];

  // Generate PDF when modal opens
  useEffect(() => {
    if (isOpen && formData) {
      generatePDF();
    }
  }, [isOpen, formData]);

  const generatePDF = async () => {
    if (!formData) {
      toast.error("No form data available. Please fill out the form first.");
      return;
    }
    
    setPdfState("loading");
    setPdfErrorMessage(null);
    setIsGenerating(true);
    setPdfBlob(null); // Reset blob state
    setPdfFilename(""); // Reset filename
    
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, serviceType }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Parse error using shared utility
        const { message, details } = parseApiError(result);
        
        console.error("PDF generation API error:", {
          status: response.status,
          requestId: result.requestId,
          message,
          details,
        });
        
        // Show detailed error message to user
        if (response.status === 400) {
          // Validation errors
          toast.error(`Validation error: ${message}`);
        } else {
          // Server errors
          toast.error(message || "Failed to generate PDF preview");
        }

        setPdfState("error");
        setPdfErrorMessage(message || "Failed to generate PDF preview");
        return;
      }

      // Validate response structure
      if (!result.pdf || !result.pdf.base64 || !result.pdf.filename) {
        console.error("Invalid PDF response structure:", result);
        toast.error("Invalid response from server. Please try again.");
        setPdfState("error");
        setPdfErrorMessage("Invalid response from server. Please try again.");
        return;
      }

      // Validate base64 before creating Blob
      const base64: string = result.pdf.base64;
      if (!base64 || base64.length < 100) {
        console.error("Invalid base64 data received for PDF");
        toast.error("Invalid PDF data received from server.");
        setPdfState("error");
        setPdfErrorMessage("Invalid PDF data received from server.");
        return;
      }

      // Convert base64 to blob using shared utility
      try {
        const blob = base64ToBlob(base64, result.pdf.mimeType || "application/pdf");
        setPdfBlob(blob);
        setPdfFilename(result.pdf.filename);
        setPdfState("ready");
        setPdfErrorMessage(null);
        toast.success("PDF generated successfully!");
      } catch (blobError) {
        console.error("Blob conversion error:", blobError);
        const errorMessage = blobError instanceof Error ? blobError.message : "Failed to process PDF data";
        toast.error(errorMessage);
        setPdfState("error");
        setPdfErrorMessage(errorMessage);
      }
    } catch (error) {
      console.error("PDF generation network error:", error);
      const errorMessage = error instanceof Error ? error.message : "Network error occurred";
      toast.error(`Failed to generate PDF: ${errorMessage}`);
      setPdfState("error");
      setPdfErrorMessage(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!pdfBlob || pdfState !== "ready") {
      toast.error("PDF not ready. Please wait for PDF generation to complete.");
      return;
    }
    
    if (!formData) {
      toast.error("Form data not available.");
      return;
    }
    
    setIsSharing(true);
    
    try {
      // Create file from blob
      const file = new File([pdfBlob], pdfFilename, { type: "application/pdf" });
      
      // Try Web Share API with files (works on modern Android Chrome)
      if (typeof navigator.share === 'function') {
        try {
          const shareData: ShareData = {
            title: `Work Order - ${config.name}`,
            text: `Work Order for ${formData.requesterName}`,
            files: [file],
          };
          
          // Check if browser supports sharing files
          if (typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast.success("PDF shared successfully!");
            return;
          }
          
          // Try sharing without files (just text)
          const textOnlyShareData: ShareData = {
            title: `Work Order - ${config.name}`,
            text: `Work Order for ${formData.requesterName} - Technician: ${formData.workCompletedBy}`,
          };
          
          if (navigator.canShare(textOnlyShareData)) {
            // First download the PDF
            downloadPDF();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Then share the text
            await navigator.share(textOnlyShareData);
            toast.success("PDF downloaded! Share via your preferred app.");
            return;
          }
        } catch (shareError) {
          // User cancelled or share failed - continue to fallback
          if ((shareError as Error).name === 'AbortError') {
            // User cancelled - don't show error
            return;
          }
          console.log("Web Share API failed, using fallback:", shareError);
        }
      }
      
      // Fallback: Download PDF and show instructions
      downloadPDF();
      toast.success("PDF downloaded! You can now share it from your Downloads folder.");
      
    } catch (error) {
      console.error("Share failed:", error);
      // Last resort: try to download
      try {
        downloadPDF();
        toast.success("PDF downloaded successfully!");
      } catch {
        toast.error("Failed to share or download. Please try again.");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob || pdfState !== "ready") {
      toast.error("PDF not ready. Please wait for PDF generation to complete.");
      return;
    }
    
    if (!pdfFilename) {
      toast.error("PDF filename not available. Please try generating the PDF again.");
      return;
    }
    
    try {
      // Use shared download utility
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to download PDF";
      toast.error(errorMessage);
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-[95vh] sm:h-auto sm:max-h-[95vh] bg-gray-100 rounded-[24px] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between flex-shrink-0`}>
          <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF Preview
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PDF Preview Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-200">
          {isGenerating ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            /* A4 Page Preview */
            <div 
              className="mx-auto bg-white shadow-xl"
              style={{
                width: "100%",
                maxWidth: "595px", // A4 width in points at 72 DPI
                minHeight: "842px", // A4 height in points
                aspectRatio: "1 / 1.414", // A4 aspect ratio
              }}
            >
              {/* Page Header - Gradient */}
              <div className={`bg-gradient-to-r ${config.gradient} px-6 py-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                    <span className={`font-bold text-lg ${serviceType === 'printers-uae' ? 'text-blue-600' : serviceType === 'g3-facility' ? 'text-emerald-600' : 'text-purple-600'}`}>{config.shortName}</span>
                  </div>
                  <span className="text-white font-bold text-lg">{config.name}</span>
                </div>
                <span className="text-white font-bold text-sm">Work Order</span>
              </div>

              {/* Page Content */}
              <div className="p-6 space-y-5 text-sm">
                {/* Section 1: Customer Details */}
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
                    <div className={`w-6 h-6 rounded ${config.sectionColor} flex items-center justify-center text-white text-xs font-bold`}>1</div>
                    <span className="font-bold text-gray-800">Customer Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 text-xs">Customer Name:</span>
                      <p className="text-gray-800">{formData.requesterName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Service Type:</span>
                      <p className="text-gray-800">{formData.customerType}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Customer Phone Number:</span>
                      <p className="text-gray-800">{formData.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-500 text-xs">Location Address:</span>
                    <p className="text-gray-800">{formData.locationAddress}</p>
                  </div>
                </div>

                {/* Section 2: Work Order Details */}
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
                    <div className={`w-6 h-6 rounded ${config.sectionColor} flex items-center justify-center text-white text-xs font-bold`}>2</div>
                    <span className="font-bold text-gray-800">Work Order Details</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <span className="text-gray-500 text-xs">Order Date & Time:</span>
                      <p className="text-gray-800">{formatDateTime(formData.orderDateTime)}</p>
                    </div>
                    {formData.quotationReferenceNumber && (
                      <div>
                        <span className="text-gray-500 text-xs">Quotation/Reference Number:</span>
                        <p className="text-gray-800">{formData.quotationReferenceNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Assigned Employee */}
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
                    <div className={`w-6 h-6 rounded ${config.sectionColor} flex items-center justify-center text-white text-xs font-bold`}>3</div>
                    <span className="font-bold text-gray-800">Assigned Employee</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <span className="text-gray-500 text-xs">Work Assigned To:</span>
                      <p className="text-gray-800">{formData.workAssignedTo}</p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Work Descriptions */}
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
                    <div className={`w-6 h-6 rounded ${config.sectionColor} flex items-center justify-center text-white text-xs font-bold`}>4</div>
                    <span className="font-bold text-gray-800">Work Descriptions</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-500 text-xs font-medium">Work Description:</span>
                      <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-gray-800 text-xs">
                        {formData.requestDescription}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-medium">Findings:</span>
                      <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-gray-800 text-xs">
                        {formData.incompleteWorkExplanation || "N/A"}
                      </div>
                    </div>
                    {formData.countReportPhoto && (
                      <div>
                        <span className="text-gray-500 text-xs font-medium">Count Report Photo:</span>
                        <img 
                          src={formData.countReportPhoto} 
                          alt="Count Report" 
                          className="mt-1 max-w-[160px] h-auto border border-gray-200 rounded"
                        />
                      </div>
                    )}
                    {formData.workPhotos && formData.workPhotos.length > 0 && (
                      <div>
                        <span className="text-gray-500 text-xs font-medium">Before and After Work Photos:</span>
                        <div className="mt-2 space-y-4">
                          {formData.workPhotos.map((pair, index) => (
                            <div key={pair.id} className="border border-gray-200 rounded p-2 bg-gray-50">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Photo Set {index + 1}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {pair.beforePhoto && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Before</p>
                                    <img 
                                      src={pair.beforePhoto} 
                                      alt={`Before work ${index + 1}`} 
                                      className="w-full max-w-[140px] h-auto border border-gray-200 rounded"
                                    />
                                  </div>
                                )}
                                {pair.afterPhoto && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">After</p>
                                    <img 
                                      src={pair.afterPhoto} 
                                      alt={`After work ${index + 1}`} 
                                      className="w-full max-w-[140px] h-auto border border-gray-200 rounded"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5: Approval & Sign-Off */}
                <div>
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 mb-3">
                    <div className={`w-6 h-6 rounded ${config.sectionColor} flex items-center justify-center text-white text-xs font-bold`}>5</div>
                    <span className="font-bold text-gray-800">Approval & Sign-Off</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <span className="text-gray-500 text-xs">Work Completed By:</span>
                      <p className="text-gray-800">{formData.workCompletedBy}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Completion Date:</span>
                      <p className="text-gray-800">{formatDate(formData.completionDate)}</p>
                    </div>
                    {formData.paymentMethod && (
                      <div>
                        <span className="text-gray-500 text-xs">Payment Method:</span>
                        <p className="text-gray-800">{formData.paymentMethod}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <span className="text-gray-500 text-xs font-medium">Technician Signature</span>
                      {formData.technicianSignature && (
                        <img 
                          src={formData.technicianSignature} 
                          alt="Technician Signature" 
                          className="h-12 object-contain my-2"
                        />
                      )}
                      <div className="border-t border-gray-800 pt-1 text-center text-xs text-gray-800">
                        {formData.workCompletedBy}
                      </div>
                      <div className="text-center text-xs text-gray-500">
                        {formatDate(formData.completionDate)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <span className="text-gray-500 text-xs font-medium">Customer Signature</span>
                      {formData.customerSignature && (
                        <img 
                          src={formData.customerSignature} 
                          alt="Customer Signature" 
                          className="h-12 object-contain my-2"
                        />
                      )}
                      <div className="border-t border-gray-800 pt-1 text-center text-xs text-gray-800">
                        {formData.customerApprovalName}
                      </div>
                      <div className="text-center text-xs text-gray-500">
                        {formatDate(formData.customerApprovalDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Footer - Gradient */}
              <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3 mt-auto`}>
                <div className="flex justify-between items-center text-white text-xs">
                  <div>
                    <div className="flex items-center gap-1">
                      <BsFillTelephoneFill className="w-3 h-3" />
                      <span>{config.tel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FaMobile className="w-3 h-3" />
                      <span>{config.mobile}</span>
                    </div>
                  </div>
                  <div className="border-l border-white/30 pl-3">
                    <div className="flex items-center gap-1">
                      <IoIosMail className="w-3.5 h-3.5" />
                      <span>{config.email}</span>
                    </div>
                  </div>
                  <div className="border-l border-white/30 pl-3">
                    {config.locations.map((location, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <FaLocationDot className="w-3 h-3" />
                        <span>{location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error message (if any) */}
        {pdfState === "error" && pdfErrorMessage && (
          <div className="bg-red-50 border-t border-red-200 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 3a9 9 0 019 9 9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9z" />
            </svg>
            <span>{pdfErrorMessage}</span>
          </div>
        )}

        {/* Modal Footer - Action Buttons */}
        <div className="bg-white border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors order-2 sm:order-1"
          >
            Close
          </button>
          <button
            onClick={downloadPDF}
            disabled={pdfState !== "ready" || !pdfBlob || isGenerating}
            className="px-4 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-3 sm:order-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={handleShare}
            disabled={pdfState !== "ready" || !pdfBlob || isSharing || isGenerating}
            className={`px-4 py-2.5 bg-gradient-to-r ${config.gradient} text-white rounded-lg font-medium ${config.hoverGradient} transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-3`}
          >
            {isSharing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Sharing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

