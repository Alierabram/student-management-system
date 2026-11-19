# BugemaDesk - Campus Administration System

BugemaDesk is a secure, role‑based campus administration system for managing students, courses, tuition, and audit trails at Bugema University.

## Overview

- **Database**: MongoDB (with JWT‑based auth)
- **Backend**: Node.js, Express, bcrypt, jsonwebtoken
- **Frontend**: HTML/CSS/JS (plain scripts, no framework)
- **Deployment**: Ready for Render (cloud) or any Node.js hosting
- **Auth**: JWT with Authorization header, no cookies
- **RBAC**: Registrar, Accounts, HOD roles with fine‑grained permissions
- **Key features**:
  - Student CRUD with course units, marks, tuition ledger
  - Public verification page
  - Chart analytics (enrollment, tuition status, programmes)
  - Bulk CSV import
  - Audit logs (immutable, Registrar only)
  - Printable transcripts, exam permits
  - QR‑code digital ID cards
  - Command palette & theme toggle

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **DB** | MongoDB (local or Atlas) |
| **API** | Express, Mongoose, JWT, bcryptjs |
| **Frontend** | HTML5, CSS3 (custom), Vanilla JS, Chart.js, qrcode.js, PapaParse (CDN) |
| **Security** | CORS, custom error handlers, rate‑friendly startup |
| **Docker‑ready** | Node 20+, standard Express patterns |
| **Testing** | 13 unit tests for validation and query building |

## Prerequisites

- Node.js 20+
- MongoDB (local: `mongodb://127.0.0.1:27017/bugemadesk` or Atlas)
- A `.env` file (see below)

## Quick Setup

```bash
# Clone this repo
# Install dependencies
npm install
# Start the app (MongoDB must be running first)
# If local MongoDB, seed initial data
node scripts/seed.js
# Run server (Render will run this automatically)
npm start
```

## Environment Variables

Create a `.env` file (never commit this) with:

```env
# MongoDB connection URI (use Atlas SRV string if cloud)
MONGODB_URI=mongodb://127.0.0.1:27017/bugemadesk

# JWT secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Optional server port (default 3000)
PORT=3000

# Node environment
NODE_ENV=production
```

**MongoDB Atlas example**:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/bugemadesk?retryWrites=true&w=majority
```

## Initial Seed Data

The first time you start the app, `scripts/seed.js` runs automatically (called from `start()` in `server.js`). It creates:

- **3 demo users** (Registrar, Accounts, HOD) with default passwords:
  - `registrar@bugemauniv.ac.ug / Admin@2026`
  - `accounts@bugemauniv.ac.ug / Accounts@2026`
  - `hod@bugemauniv.ac.ug / Hod@2026`
- **12 sample students** with courses, marks, and tuition payments
- **2 initial audit logs**

## API Endpoints (Protected – auth via `/api/auth/login`)

### Students
- `GET /api/students` — list/search (pageable, filtered, sortable)
- `GET /api/students/:id` — single record
- `POST /api/students` — create
- `PUT /api/students/:id` — full update
- `DELETE /api/students/:id` — soft delete (updates `deletedAt`)
- `POST /api/students/:id/courses` — assign course units (Registrar/HOD)
- `POST /api/students/:id/tuition` — record payment (Registrar/Accounts)
- `GET /api/students/chart` — programme distribution (for charts)
- `GET /api/students/enrollment-chart` — enrollment by semester
- `GET /api/students/tuition-chart` — tuition status summary
- `GET /api/students/academic-year-chart` — academic year distribution
- `GET /api/students/stats` — dashboard summary (total, active, tuition cleared, programmes, departments)
- `GET /api/students/options` — distinct programmes & departments (for UI selects)
- `POST /api/students/bulk-import` — CSV import (Registrar only, `multer`)
- `GET /api/students/public/verify/:regNo` — public verification (no auth, supports slashes in regNo)

### Audit Logs (Registrar only)
- `GET /api/audit-logs` — paginated audit trail (immutable)

### Auth
- `POST /api/auth/login` — sign‑in (supports remember‑me via localStorage/sessionStorage)
- `GET /api/auth/me` — current user info (protected)

### Health
- `GET /api/health` — liveliness/readiness probe

## RBAC Rules

| Role | Permissions (Student routes) |
|------appa (URL: /api/students) | |
| **Registrar** | All (CRUD, courses, tuition, charts, bulk‑import, audit logs) |
| **Accounts** | `POST /:id/tuition` only (tuition ledger) |
| **HOD** | `POST /:id/courses` only (assign courses/marks) |

**Global**: `protect` middleware enforces token + role check for all student routes.

## Frontend Features

- **Dark/Light theme** toggle (persist in localStorage)
- **Command palette** (Ctrl+K) for fast navigation and actions
- **Responsive UI** with hamburger menu on mobile
- **Modals**: student form, profile, academics & marks, tuition ledger, CSV import, digital ID
- **Import CSV**: PapaParse (frontend) + `csv-parser` (backend) with sample download
- **Analytics**: Chart.js integrated (3 charts in dashboard)
- **Print**: `@media print` styles for directory, registration slip, transcript, exam permit, digital ID
- **QR code** digital ID card modal (links to public `/verify.html?regNo=...`)
- **Toast notifications** (success/error)
- **Login guard**: app.js `init()` redirects to `/login.html` if no token

## UI Flow

1. **Open app** → `http://localhost:3000/` redirects to `/login.html`
2. **Login** with any demo role → token stored, redirected to dashboard (`index.html`)
3. **Dashboard** shows hero card, 5 stats, recent registrations, programme chart
4. **Navigation** sidebar (Overview, Students, Reports, Audit Logs)
5. **Students** list with search, filters, pagination, bulk CSV actions
6. **Profile modal** → Print registration slip (print‑optimized)
7. **Academic & Marks modal** → assign / edit courses
8. **Tuition ledger modal** → record payment (RBAC guarded)
9. **Print directory** (filtered list)
10. **Public verification** → `/verify.html` (no auth, can be bookmarked/shared)

## Docker / Render Deployment

**Render**: Drag‑and‑drop this repo, set environment variables, and choose the `Node.js` runtime.

**Dockerfile** (optional):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Testing

Run the unit tests:

```bash
npm test
```

All 13 tests pass. Tests cover:
- `validateStudentPayload` (required fields, formats, normalization)
- `buildStudentQuery` (filters, pagination, sorting)

## Printing

@ The `print-only` section and `printing-*` body classes are used to isolate print‑styled content.
- **Directory**: `/api/students/print-directory` (filtered records)
- **Slip**: per‑student registration slip (profile modal)
- **Transcript**: generated in `printSlipBtn` modal (requires CGPA, cleared tuition)
- **Exam Permit**: print‑styled modal (granted if `tuitionStatus===Cleared` OR `tuitionPaid ≥ 70%`)
- **Digital ID**: QR code modal (print with `printDigitalIdBtn`)

## Future Enhancements

- Email notifications for tuition payments
- Student self‑service portal (read‑only, public regNo)
- Advanced filtering & export (JSON, Excel)
- Automated course scheduling
- Mobile push notifications
- Role‑based UI visibility (customize dashboards per role)

## Credits

- Forked / adapted from original Kilo BugemaDesk starter
- Used Chart.js (v4), qrcode.js, and PapaParse via CDN (no npm install)
- RBAC and audit logging patterns from official Kilo docs
- Prints optimized for A4 portrait with browser‑based page breaks
- Theme toggle uses CSS custom properties for instant switch

## Legal

© 2024–2026 Bugema University. All code is MIT‑licensed.

---

**Quick deployment steps:**

1. **Push this repo to GitHub** (`git remote add origin <repo> && git push -u origin master`)
2. **Create MongoDB Atlas cluster**, get SRV URI, and set `MONGODB_URI` in Render env
3. **Set JWT_SECRET** in Render env (generates a random one if not set)
4. **Link Render app to GitHub repo**
5. **Deploy** – Render will run `npm install && npm start`
6. **Visit your Render URL** – app is live, login page at `/`

BugemaDesk is now production‑ready, cloud‑deployable, and fully documented. Enjoy managing the campus! 🚀
