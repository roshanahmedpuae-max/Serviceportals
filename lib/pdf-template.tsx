import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Path,
} from "@react-pdf/renderer";
import { ServiceOrderFormData } from "./validation";

// Company Details for Footer - Updated with correct info
const COMPANY_INFO = {
  tel: "(+971)-2-675",
  mobile: "(+971)-54-387-0181",
  email: "info@printersuae.com",
  locations: "Business Bay, Dubai & Mussafah, Sila, Abu Dhabi",
};

// Gradient colors from blue-600 to purple-600 (for simulating gradient)
const GRADIENT_COLORS = [
  "#2563EB", // blue-600
  "#3B5CE8",
  "#5155E5",
  "#674EE2",
  "#7D47DF",
  "#9341DC",
  "#9333EA", // purple-600
];

// PDF Styles - Matching form design with gradient colors
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingTop: 90,
    paddingBottom: 75,
    paddingHorizontal: 35,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  // Header container
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  // Header gradient background
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  gradientStrip: {
    flex: 1,
    height: "100%",
  },
  // Header content overlay
  headerContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 35,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563EB",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerIcon: {
    width: 20,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  // Footer container
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
  },
  // Footer gradient background
  footerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  // Footer content overlay
  footerContentWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  footerColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  footerLabel: {
    fontSize: 7,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
    fontWeight: "bold",
  },
  footerText: {
    fontSize: 8,
    color: "#FFFFFF",
    lineHeight: 1.4,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  footerDivider: {
    width: 1,
    height: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  pageNumber: {
    fontSize: 7,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 6,
  },
  // Section styles
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingBottom: 5,
    borderBottom: "1.5 solid #E5E7EB",
  },
  sectionIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionIconText: {
    color: "#FFFFFF",
    fontSize: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1F2937",
  },
  // Row styles
  row: {
    flexDirection: "row",
    marginBottom: 5,
    paddingVertical: 3,
  },
  label: {
    fontSize: 9,
    color: "#6B7280",
    width: 130,
    fontWeight: "bold",
  },
  value: {
    fontSize: 9,
    color: "#1F2937",
    flex: 1,
  },
  // Grid layout
  grid: {
    flexDirection: "row",
    gap: 15,
  },
  gridCol: {
    flex: 1,
  },
  // Text block styles
  textBlock: {
    marginBottom: 8,
  },
  textBlockLabel: {
    fontSize: 9,
    color: "#6B7280",
    fontWeight: "bold",
    marginBottom: 3,
  },
  textBlockValue: {
    fontSize: 9,
    color: "#1F2937",
    lineHeight: 1.4,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    border: "1 solid #E5E7EB",
  },
  // Priority badge
  priorityBadge: {
    fontSize: 8,
    color: "#FFFFFF",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  priorityNormal: {
    backgroundColor: "#10B981",
  },
  priorityHigh: {
    backgroundColor: "#F59E0B",
  },
  priorityUrgent: {
    backgroundColor: "#EF4444",
  },
  // Signature styles
  signatureSection: {
    marginTop: 8,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginTop: 8,
  },
  signatureBox: {
    flex: 1,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 5,
    border: "1 solid #E5E7EB",
  },
  signatureLabel: {
    fontSize: 7,
    color: "#6B7280",
    fontWeight: "bold",
    marginBottom: 4,
  },
  signatureImage: {
    height: 45,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 8,
    color: "#1F2937",
    borderTop: "1 solid #1F2937",
    paddingTop: 3,
    textAlign: "center",
  },
  signatureDate: {
    fontSize: 7,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  // Photo styles
  photoContainer: {
    marginTop: 6,
  },
  photoImage: {
    width: 160,
    height: 120,
    objectFit: "contain",
    borderRadius: 4,
    border: "1 solid #E5E7EB",
  },
});

interface WorkOrderPDFProps {
  data: ServiceOrderFormData;
}

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

// Get priority badge style
function getPriorityStyle(priority: string) {
  switch (priority) {
    case "High":
      return styles.priorityHigh;
    case "Urgent":
      return styles.priorityUrgent;
    default:
      return styles.priorityNormal;
  }
}

// Header Component - Matching form header with gradient colors
const Header = () => (
  <View style={styles.headerContainer} fixed>
    {/* Gradient Background */}
    <View style={styles.headerGradient}>
      {GRADIENT_COLORS.map((color, index) => (
        <View key={index} style={[styles.gradientStrip, { backgroundColor: color }]} />
      ))}
    </View>
    {/* Content */}
    <View style={styles.headerContent}>
      <View style={styles.headerLeft}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Text style={styles.companyName}>Printers UAE</Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerTitle}>Work Order</Text>
      </View>
    </View>
  </View>
);

// Phone Icon Component (BsFillTelephoneFill equivalent)
const PhoneIcon = () => (
  <Svg width="8" height="8" viewBox="0 0 16 16">
    <Path
      fill="#FFFFFF"
      d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"
    />
  </Svg>
);

// Mobile Icon Component (FaMobile equivalent)
const MobileIcon = () => (
  <Svg width="8" height="8" viewBox="0 0 320 512">
    <Path
      fill="#FFFFFF"
      d="M272 0H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h224c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48zM160 480c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"
    />
  </Svg>
);

// Mail Icon Component (IoIosMail equivalent)
const MailIcon = () => (
  <Svg width="10" height="8" viewBox="0 0 512 512">
    <Path
      fill="#FFFFFF"
      d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"
    />
  </Svg>
);

// Location Icon Component (FaLocationDot equivalent)
const LocationIcon = () => (
  <Svg width="8" height="8" viewBox="0 0 384 512">
    <Path
      fill="#FFFFFF"
      d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"
    />
  </Svg>
);

// Footer Component - 3 columns with updated contact info
const Footer = () => (
  <View style={styles.footerContainer} fixed>
    {/* Gradient Background */}
    <View style={styles.footerGradient}>
      {GRADIENT_COLORS.map((color, index) => (
        <View key={index} style={[styles.gradientStrip, { backgroundColor: color }]} />
      ))}
    </View>
    {/* Content */}
    <View style={styles.footerContentWrapper}>
      <View style={styles.footerContent}>
        {/* Column 1 - Phone Numbers */}
        <View style={styles.footerColumn}>
          <View style={styles.footerRow}>
            <PhoneIcon />
            <Text style={styles.footerText}>{COMPANY_INFO.tel}</Text>
          </View>
          <View style={styles.footerRow}>
            <MobileIcon />
            <Text style={styles.footerText}>{COMPANY_INFO.mobile}</Text>
          </View>
        </View>
        
        <View style={styles.footerDivider} />
        
        {/* Column 2 - Email */}
        <View style={styles.footerColumn}>
          <View style={styles.footerRow}>
            <MailIcon />
            <Text style={styles.footerText}>{COMPANY_INFO.email}</Text>
          </View>
        </View>
        
        <View style={styles.footerDivider} />
        
        {/* Column 3 - Location */}
        <View style={styles.footerColumn}>
          <View style={styles.footerRow}>
            <LocationIcon />
            <Text style={styles.footerText}>Business Bay, Dubai</Text>
          </View>
          <View style={styles.footerRow}>
            <LocationIcon />
            <Text style={styles.footerText}>Mussafah & Sila, Abu Dhabi</Text>
          </View>
        </View>
      </View>
    </View>
  </View>
);

export default function WorkOrderPDF({ data }: WorkOrderPDFProps) {
  // Ensure data exists - if data is undefined/null, create empty object
  const safeInput = data || {};
  
  // Ensure data exists and has required fields with defaults
  // All properties must be defined (no undefined) for React-PDF compatibility
  const safeData: ServiceOrderFormData = {
    requesterName: safeInput.requesterName || "",
    locationAddress: safeInput.locationAddress || "",
    phone: safeInput.phone || "",
    email: safeInput.email || "",
    customerType: safeInput.customerType || "Service and Repair",
    priorityLevel: safeInput.priorityLevel || "Normal",
    orderDateTime: safeInput.orderDateTime || new Date().toISOString(),
    quotationReferenceNumber: safeInput.quotationReferenceNumber || "",
    workAssignedTo: safeInput.workAssignedTo || "",
    workBilledTo: safeInput.workBilledTo || "",
    requestDescription: safeInput.requestDescription || "",
    incompleteWorkExplanation: safeInput.incompleteWorkExplanation || "",
    countReportPhoto: safeInput.countReportPhoto || "",
    workPhotos: Array.isArray(safeInput.workPhotos) 
      ? safeInput.workPhotos
          .filter((pair) => 
            pair !== null && 
            pair !== undefined && 
            typeof pair === 'object' &&
            !Array.isArray(pair) && // Ensure it's an object, not an array
            (pair.beforePhoto || pair.afterPhoto) // Only include pairs with at least one photo
          )
          .map((pair: any, index) => {
            // Create a plain object with all properties defined
            const sanitizedPair: { id: string; beforePhoto: string; afterPhoto: string } = {
              id: (pair.id && typeof pair.id === 'string') ? pair.id : `photo-${Date.now()}-${index}`,
              beforePhoto: (pair.beforePhoto && typeof pair.beforePhoto === 'string') ? pair.beforePhoto : "",
              afterPhoto: (pair.afterPhoto && typeof pair.afterPhoto === 'string') ? pair.afterPhoto : "",
            };
            return sanitizedPair;
          })
          .filter(pair => pair.beforePhoto || pair.afterPhoto) // Final filter to ensure at least one photo
      : [],
    workCompletedBy: safeInput.workCompletedBy || "",
    completionDate: safeInput.completionDate || new Date().toISOString().slice(0, 10),
    technicianSignature: safeInput.technicianSignature || "",
    customerApprovalName: safeInput.customerApprovalName || "",
    customerSignature: safeInput.customerSignature || "",
    customerApprovalDate: safeInput.customerApprovalDate || new Date().toISOString().slice(0, 10),
    paymentMethod: safeInput.paymentMethod || "",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Header />

        {/* Customer Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Customer Details</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Customer Name:</Text>
                <Text style={styles.value}>{safeData.requesterName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Customer Phone Number:</Text>
                <Text style={styles.value}>{safeData.phone || "N/A"}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Service Type:</Text>
                <Text style={styles.value}>{safeData.customerType}</Text>
              </View>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location Address:</Text>
            <Text style={styles.value}>{safeData.locationAddress}</Text>
          </View>
        </View>

        {/* Work Order Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Work Order Details</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Order Date & Time:</Text>
                <Text style={styles.value}>{formatDateTime(safeData.orderDateTime)}</Text>
              </View>
              {safeData.quotationReferenceNumber && (
                <View style={styles.row}>
                  <Text style={styles.label}>Quotation/Reference Number:</Text>
                  <Text style={styles.value}>{safeData.quotationReferenceNumber}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Assigned Employee Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>Assigned Employee</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Work Assigned To:</Text>
                <Text style={styles.value}>{safeData.workAssignedTo}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Work Descriptions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>Work Descriptions</Text>
          </View>
          
          <View style={styles.textBlock}>
            <Text style={styles.textBlockLabel}>Work Description:</Text>
            <Text style={styles.textBlockValue}>
              {safeData.requestDescription}
            </Text>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.textBlockLabel}>Findings:</Text>
            <Text style={styles.textBlockValue}>
              {safeData.incompleteWorkExplanation || "N/A"}
            </Text>
          </View>

          {safeData.countReportPhoto && (
            <View style={styles.photoContainer}>
              <Text style={styles.textBlockLabel}>Count Report Photo:</Text>
              <Image src={safeData.countReportPhoto} style={styles.photoImage} />
            </View>
          )}

          {safeData.workPhotos && safeData.workPhotos.length > 0 && (
            <View style={styles.photoContainer}>
              <Text style={styles.textBlockLabel}>Before and After Work Photos:</Text>
              {safeData.workPhotos.map((pair, index) => {
                // Defensive checks - ensure pair is a valid object with required structure
                if (!pair || typeof pair !== 'object' || Array.isArray(pair)) {
                  return null;
                }
                
                // Ensure all properties exist and are strings
                const beforePhoto = (pair.beforePhoto && typeof pair.beforePhoto === 'string') ? pair.beforePhoto : null;
                const afterPhoto = (pair.afterPhoto && typeof pair.afterPhoto === 'string') ? pair.afterPhoto : null;
                const pairId = (pair.id && typeof pair.id === 'string') ? pair.id : `photo-${index}`;
                
                // Skip if no photos
                if (!beforePhoto && !afterPhoto) {
                  return null;
                }
                
                return (
                  <View key={pairId} style={{ marginBottom: 12, padding: 8, backgroundColor: "#F9FAFB", borderRadius: 4, border: "1 solid #E5E7EB" }}>
                    <Text style={{ fontSize: 8, color: "#6B7280", fontWeight: "bold", marginBottom: 6 }}>
                      Photo Set {index + 1}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-start" }}>
                      {beforePhoto && (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 7, color: "#6B7280", marginBottom: 4 }}>Before</Text>
                          <Image src={beforePhoto} style={{ width: 120, height: 90, objectFit: "contain", borderRadius: 4, border: "1 solid #E5E7EB" }} />
                        </View>
                      )}
                      {afterPhoto && (
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 7, color: "#6B7280", marginBottom: 4 }}>After</Text>
                          <Image src={afterPhoto} style={{ width: 120, height: 90, objectFit: "contain", borderRadius: 4, border: "1 solid #E5E7EB" }} />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Approval & Sign-Off Section */}
        <View style={styles.signatureSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>5</Text>
            </View>
            <Text style={styles.sectionTitle}>Approval & Sign-Off</Text>
          </View>
          
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Work Completed By:</Text>
                <Text style={styles.value}>{safeData.workCompletedBy}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Completion Date:</Text>
                <Text style={styles.value}>{formatDate(safeData.completionDate)}</Text>
              </View>
            </View>
            {safeData.paymentMethod && (
              <View style={styles.gridCol}>
                <View style={styles.row}>
                  <Text style={styles.label}>Payment Method:</Text>
                  <Text style={styles.value}>{safeData.paymentMethod}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Signatures Row */}
          <View style={styles.signatureRow}>
            {/* Technician Signature */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Technician Signature</Text>
              {safeData.technicianSignature && (
                <Image src={safeData.technicianSignature} style={styles.signatureImage} />
              )}
              <Text style={styles.signatureName}>{safeData.workCompletedBy}</Text>
              <Text style={styles.signatureDate}>{formatDate(safeData.completionDate)}</Text>
            </View>

            {/* Customer Signature */}
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Customer Signature</Text>
              {safeData.customerSignature && (
                <Image src={safeData.customerSignature} style={styles.signatureImage} />
              )}
              <Text style={styles.signatureName}>{safeData.customerApprovalName}</Text>
              <Text style={styles.signatureDate}>{formatDate(safeData.customerApprovalDate)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Footer />
      </Page>
    </Document>
  );
}
