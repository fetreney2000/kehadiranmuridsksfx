# Kehadiran Murid — Public REST API (v1)

Base URL: `https://kehadiranmuridsksfx.vercel.app/api/v1` (production) or `http://localhost:3000/api/v1` (local)

All endpoints return JSON. All endpoints require API key authentication.

---

## Authentication

**Scheme:** `Authorization: Bearer <api-key>`

The API key is set server-side via the `API_KEYS` environment variable (comma-separated for multiple keys).

| Response | Status | Meaning |
|---|---|---|
| Missing header | 401 | No `Authorization` header provided |
| Invalid scheme | 401 | Header present but not `Bearer <key>` |
| Unknown key | 403 | Provided key not in the configured list |
| Valid key | 200 | Access granted |

CORS is enabled for all origins by default (`ALLOWED_ORIGINS=*`). Preflight `OPTIONS` requests return 204 with appropriate headers.

---

## Endpoints

### `GET /attendance`

List attendance records with filtering and pagination.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `classId` | string | — | Filter by class ID |
| `studentId` | string | — | Filter by student ID |
| `date` | string (YYYY-MM-DD) | — | Exact date filter |
| `from` | string (YYYY-MM-DD) | — | Range start (requires `to`) |
| `to` | string (YYYY-MM-DD) | — | Range end (requires `from`) |
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 100 | Items per page (max 1000) |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "studentId": "664a1b2c3d4e5f6a7b8c9d0a",
      "studentName": "Ahmad bin Ali",
      "classId": "663a1b2c3d4e5f6a7b8c9d0b",
      "className": "4 Dinamik",
      "date": "2026-07-21",
      "status": "hadir",
      "method": "qr",
      "recordedBy": "662a1b2c3d4e5f6a7b8c9d0c",
      "recordedAt": "2026-07-21T01:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

---

### `GET /attendance/today`

Today's attendance summary, grouped by class. Computed in Asia/Kuala_Lumpur timezone.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `classId` | string | — | Filter to a single class |

**Response `200 OK`:**
```json
{
  "date": "2026-07-21",
  "totalStudents": 120,
  "totalHadir": 98,
  "totalTidakHadir": 22,
  "attendancePercentage": 82,
  "perClass": [
    {
      "classId": "663a1b2c3d4e5f6a7b8c9d0b",
      "className": "4 Dinamik",
      "total": 30,
      "hadir": 25,
      "tidakHadir": 5,
      "percentage": 83
    }
  ],
  "absentList": [
    {
      "id": "664a1b2c3d4e5f6a7b8c9d0a",
      "name": "Ahmad bin Ali",
      "sex": "L"
    }
  ]
}
```

> **Attendance strategy:** Only "hadir" records are stored. Absent students = class roster minus students with a "hadir" record for the date. This means the attendance collection only contains present records, and absence is computed by set difference.

---

### `GET /attendance/stats`

Aggregated attendance statistics over a date range.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `type` | string | `daily` | Period: `daily`, `weekly`, `monthly`, `yearly`, or `custom` |
| `classId` | string | — | Filter to a single class |
| `from` | string (YYYY-MM-DD) | — | Required when `type=custom` |
| `to` | string (YYYY-MM-DD) | — | Required when `type=custom` |

Period ranges (KL timezone):
- `daily` — today only
- `weekly` — Monday through Sunday of the current week
- `monthly` — 1st through last day of current month
- `yearly` — Jan 1 through Dec 31 of current year
- `custom` — uses the `from`/`to` params provided

**Response `200 OK`:**
```json
{
  "range": {
    "from": "2026-07-01",
    "to": "2026-07-21"
  },
  "totalStudents": 120,
  "days": [
    {
      "date": "2026-07-01",
      "hadir": 110,
      "tidakHadir": 10,
      "percentage": 92
    }
  ],
  "totalRecords": 2310
}
```

---

### `GET /students`

List students with pagination.

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `classId` | string | — | Filter by class ID |
| `active` | string | — | `true` for active only, `false` for inactive only, omit for all |
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 200 | Items per page (max 1000) |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "664a1b2c3d4e5f6a7b8c9d0a",
      "name": "Ahmad bin Ali",
      "sex": "L",
      "classId": "663a1b2c3d4e5f6a7b8c9d0b",
      "className": "4 Dinamik",
      "qrCode": "550e8400-e29b-41d4-a716-446655440000",
      "isActive": true,
      "createdAt": "2026-01-15T08:00:00.000Z",
      "updatedAt": "2026-07-20T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 200,
    "totalPages": 1
  }
}
```

> `qrCode` is a UUIDv4 string used for QR-based attendance marking.

---

### `GET /classes`

List all classes with student counts.

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "663a1b2c3d4e5f6a7b8c9d0b",
      "name": "4 Dinamik",
      "guruKelasId": "662a1b2c3d4e5f6a7b8c9d0c",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z",
      "studentCount": 30
    }
  ]
}
```

---

## Data Types

| Field | Type | Values | Notes |
|---|---|---|---|
| `sex` | string | `L` (male), `P` (female) | |
| `status` | string | `hadir` | Only present records stored; absence is computed |
| `method` | string | `qr`, `toggle` | How attendance was marked |
| `date` | string | `YYYY-MM-DD` | Always in KL timezone (UTC+8) |
| `recordedAt` | string | ISO 8601 | UTC timestamp |
| `isActive` | boolean | `true`, `false` | Soft-delete flag for students |

---

## Error Responses

```json
// 401 — No or malformed auth header
{ "error": "Unauthorized. Provide an API key via Authorization: Bearer <key>" }

// 403 — Invalid or unknown API key
{ "error": "Forbidden. Invalid API key." }

// 405 — Method not allowed (only GET supported)
```

---

## Usage Examples

```bash
# Today's attendance for a specific class
curl -H "Authorization: Bearer your-api-key" \
  "https://kehadiranmuridsksfx.vercel.app/api/v1/attendance/today?classId=663a1b2c3d4e5f6a7b8c9d0b"

# Monthly stats for entire school
curl -H "Authorization: Bearer your-api-key" \
  "https://kehadiranmuridsksfx.vercel.app/api/v1/attendance/stats?type=monthly"

# Attendance records for a date range
curl -H "Authorization: Bearer your-api-key" \
  "https://kehadiranmuridsksfx.vercel.app/api/v1/attendance?from=2026-07-01&to=2026-07-21&page=1&limit=50"

# All active students
curl -H "Authorization: Bearer your-api-key" \
  "https://kehadiranmuridsksfx.vercel.app/api/v1/students?active=true"

# All classes (for ID lookup)
curl -H "Authorization: Bearer your-api-key" \
  "https://kehadiranmuridsksfx.vercel.app/api/v1/classes"
```

---

## Internal API (Cookie-based)

These endpoints exist under `/api/` but use JWT cookie auth (not API keys). They power the web frontend and are not intended for external consumers unless the calling app can manage cookie-based sessions.

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns Set-Cookie |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Current session info |
| GET | `/api/attendance` | Attendance records (same as v1 but cookie auth) |
| POST | `/api/attendance` | Mark students as hadir |
| GET | `/api/reports` | Aggregated reports (multiple modes) |
| GET/POST | `/api/students` | List/create students |
| PATCH/DELETE | `/api/students/[id]` | Update/soft-delete student |
| GET/POST | `/api/classes` | List/create classes |
| PATCH/DELETE | `/api/classes/[id]` | Update/delete class |
| GET/POST | `/api/users` | List/create users |
| PATCH/DELETE | `/api/users/[id]` | Update/delete user |
