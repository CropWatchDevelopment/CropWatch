# JWT PDF Generation API Guide

## 📋 **New Endpoint Created**

### **Endpoint:** `/api/devices/{devEui}/pdf`
- **Method:** `GET`
- **Authentication:** JWT Bearer token required
- **Purpose:** Generate PDF reports for device data (server-to-server)
- **Use Cases:** Node-RED automation, Postman testing, external integrations

---

## 🔑 **Authentication Steps**

### 1. **Get JWT Token**
```bash
# Login to get JWT token
curl -X POST "http://localhost:5173/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Response:**
```json
{
  "user": { ... },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": 1735689600
  }
}
```

### 2. **Extract the `access_token`** from the response

---

## 📄 **Generate PDF Report**

### **Postman/cURL Example:**
```bash
curl -X GET "http://localhost:5173/api/devices/2CF7F1C0630000AC/pdf?start=2025-05-01&end=2025-06-06" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  --output "device-report.pdf"
```

### **Parameters:**
- `start`: Start date (YYYY-MM-DD format)
- `end`: End date (YYYY-MM-DD format)
- `devEui`: Device EUI (in URL path)

### **Headers Required:**
- `Authorization: Bearer {your-jwt-token}`

---

## ✅ **Expected Response**

### **Success (200):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="device-{devEui}-report-{start}-to-{end}.pdf"`
- **Body:** PDF binary data

### **Error Responses:**

#### **401 Unauthorized:**
```json
{
  "error": "Authorization header with Bearer token is required"
}
```

#### **403 Forbidden:**
```json
{
  "error": "You do not have permission to access this device"
}
```

#### **404 Not Found:**
```json
{
  "error": "No data found for device 2CF7F1C0630000AC in the specified date range",
  "device": "2CF7F1C0630000AC",
  "dateRange": { "start": "2025-05-01", "end": "2025-06-06" },
  "user": "user@example.com"
}
```

#### **400 Bad Request:**
```json
{
  "error": "Missing required parameters: Both start and end dates are required",
  "example": "?start=2025-05-01&end=2025-06-06"
}
```

---

## 🤖 **Node-RED Integration**

### **HTTP Request Node Configuration:**
- **Method:** `GET`
- **URL:** `http://your-domain.com/api/devices/{devEui}/pdf?start=2025-05-01&end=2025-06-06`
- **Headers:** 
  ```json
  {
    "Authorization": "Bearer {{jwt_token}}"
  }
  ```
- **Return:** `a binary buffer`

### **Flow Example:**
```
[Inject] → [HTTP Request] → [File Out] → [Email/Processing]
```

---

## 📊 **PDF Content (Professional Layout)**

The generated PDF now matches the browser version exactly:
- **Japanese Header:** "デバイスレポート" with device EUI
- **Professional Metadata:** Period, user, generation time in Japanese
- **Data Table Features:**
  - Color-coded temperature values (red/orange/yellow/green)
  - Proper Japanese column headers: "日時", "時刻", "値1", "値2"
  - 30-minute interval sampling for optimal data density
  - Temperature filtering (>-20°C) to remove invalid readings
  - Multiple pages with consistent formatting
- **High-Quality Output:** Same PDFKit engine as browser version

---

## 🛡️ **Security Features**

- ✅ **JWT Authentication:** Validates token before processing
- ✅ **Permission Checking:** Verifies user has access to the device
- ✅ **RLS Compliance:** Respects Supabase Row Level Security
- ✅ **Error Handling:** Detailed error messages for debugging
- ✅ **Audit Trail:** Logs all PDF generation requests

---

## 🧪 **Testing Checklist**

- [ ] Test with valid JWT token
- [ ] Test with expired JWT token
- [ ] Test with invalid device EUI
- [ ] Test with date range that has no data
- [ ] Test with date range that has data
- [ ] Verify PDF downloads correctly
- [ ] Check PDF content is readable
- [ ] Test Node-RED integration
- [ ] Verify error responses are helpful 