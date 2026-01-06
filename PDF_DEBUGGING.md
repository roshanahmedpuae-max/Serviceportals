# PDF Generation Debugging Guide

This guide helps troubleshoot PDF generation issues across all service order portals (Printers UAE, G3 Facility, IT Service).

## Architecture Overview

The PDF generation flow consists of:

1. **Client Forms** (`components/ServiceOrderForm.tsx`, `G3FacilityForm.tsx`, `ITServiceForm.tsx`)
   - Collect form data
   - Validate using `serviceOrderSchema`
   - Open `PDFPreviewModal` with form data

2. **PDF Preview Modal** (`components/PDFPreviewModal.tsx`)
   - Calls `/api/generate-pdf` with form data + `serviceType`
   - Converts base64 response to Blob
   - Displays preview and handles download/share

3. **API Routes**
   - `/api/generate-pdf` - Preview generation
   - `/api/submit-order` - Final submission (includes email)

4. **PDF Service** (`lib/pdf-service.ts`)
   - Centralized PDF generation logic
   - Data sanitization and normalization
   - Error handling

5. **PDF Template** (`lib/pdf-template.tsx`)
   - React-PDF component
   - Renders work order document

## Common Issues and Solutions

### Issue: "Cannot read properties of undefined (reading 'hasOwnProperty')"

**Cause**: React-PDF renderer encountering undefined/null values in data structures.

**Solution**:
1. Check server logs for the request ID (format: `pdf-{timestamp}-{random}`)
2. Verify `workPhotos` array structure - each item must have `id`, `beforePhoto`, `afterPhoto`
3. Ensure all required fields have defaults (handled by `pdf-service.ts`)

**Debug Steps**:
```bash
# Check server logs for request ID
# Look for log entries like:
# [pdf-1234567890-abc123] PDF generation request received: {...}
# [pdf-1234567890-abc123] PDF rendering error: {...}
```

### Issue: "Validation failed" errors

**Cause**: Form data doesn't match `serviceOrderSchema` requirements.

**Solution**:
1. Check browser console for validation errors
2. Verify all required fields are filled:
   - `requesterName` (min 2 chars)
   - `locationAddress` (min 5 chars)
   - `customerType`
   - `orderDateTime`
   - `workAssignedTo`
   - `requestDescription` (min 10 chars)
   - `workCompletedBy`
   - `completionDate`
   - `technicianSignature`
   - `customerApprovalName`
   - `customerSignature`
   - `customerApprovalDate`

**Debug Steps**:
- Open browser DevTools → Network tab
- Submit form and check `/api/generate-pdf` request
- Inspect response for `details` object with field-level errors

### Issue: PDF preview shows but download fails

**Cause**: Blob conversion or download logic issue.

**Solution**:
1. Check browser console for errors
2. Verify `pdfBlob` and `pdfFilename` are set in `PDFPreviewModal`
3. Ensure browser allows downloads (check popup blockers)

**Debug Steps**:
```javascript
// In browser console, check:
console.log('PDF Blob:', pdfBlob);
console.log('PDF Filename:', pdfFilename);
```

### Issue: Different behavior across portals

**Cause**: Portal-specific data normalization issues.

**Solution**:
1. Verify `serviceType` is correctly passed:
   - Printers UAE: `"printers-uae"`
   - G3 Facility: `"g3-facility"`
   - IT Service: `"it-service"`
2. Check portal-specific mappers in `lib/pdf-mappers.ts`
3. Ensure `workPhotos` structure matches expectations (G3 uses `MultiplePhotoAttachment`)

## Debugging Checklist

### Server-Side Debugging

1. **Check Request Logs**
   ```bash
   # Look for structured logs with request IDs
   # Format: [requestId] Message
   ```

2. **Verify Data Sanitization**
   - Check `lib/pdf-service.ts` → `sanitizeServiceOrderData()`
   - Ensure `workPhotos` are properly filtered and mapped

3. **Check PDF Rendering**
   - Look for "PDF rendering error" logs
   - Verify React-PDF component receives valid data

### Client-Side Debugging

1. **Network Tab**
   - Check `/api/generate-pdf` request payload
   - Verify response structure (`pdf.base64`, `pdf.filename`)
   - Check for error responses

2. **Console Logs**
   - Look for "PDF generation API error" logs
   - Check for blob conversion errors

3. **Form Validation**
   - Ensure react-hook-form validation passes before opening preview
   - Check for client-side validation errors

## Portal-Specific Notes

### Printers UAE (`ServiceOrderForm`)
- Uses single `countReportPhoto` (optional)
- `workPhotos` typically empty
- Default `serviceType`: `"printers-uae"`

### G3 Facility (`G3FacilityForm`)
- Uses `MultiplePhotoAttachment` component
- `workPhotos` array with before/after pairs
- Default `serviceType`: `"g3-facility"`
- **Common Issue**: Empty photo pairs in array - ensure pairs are filtered

### IT Service (`ITServiceForm`)
- Similar to Printers UAE
- Default `serviceType`: `"it-service"`

## Testing Checklist

### Positive Tests
- [ ] Fill complete form, preview PDF, verify content matches form
- [ ] Download PDF, verify file opens correctly
- [ ] Submit form, verify email received (if configured)
- [ ] Test with optional fields empty (signatures, photos)
- [ ] Test with multiple workPhotos (G3 Facility)

### Negative Tests
- [ ] Submit form with missing required fields → should show validation errors
- [ ] Submit form with invalid data types → should show validation errors
- [ ] Test with very large images → should warn but still work
- [ ] Test network failure → should show appropriate error message

## Environment Variables

Ensure these are set for email functionality:
- `SMTP_USER`
- `SMTP_PASS`
- `ADMIN_EMAIL` (optional, defaults to `SMTP_USER`)

## Request Flow Diagram

```
Form Submit
  ↓
PDFPreviewModal.generatePDF()
  ↓
POST /api/generate-pdf { formData, serviceType }
  ↓
Validate with serviceOrderSchema
  ↓
mapFormDataToServiceOrderData() [portal-specific]
  ↓
generateWorkOrderPdfBuffer() [sanitize + render]
  ↓
WorkOrderPDF component [React-PDF]
  ↓
Return { base64, filename }
  ↓
Convert to Blob → Display Preview → Download
```

## Getting Help

If issues persist:

1. **Collect Logs**:
   - Server console logs (with request IDs)
   - Browser console logs
   - Network tab request/response

2. **Check Data**:
   - Form data structure
   - API request payload
   - API response structure

3. **Verify Environment**:
   - Node.js version (>=18.0.0)
   - Dependencies installed (`npm install`)
   - Environment variables set

4. **Test Isolation**:
   - Test each portal separately
   - Test with minimal form data
   - Test with/without optional fields

