# HU ERP Development

Haridwar University ERP is a full-stack campus management system built for academic administration, students, faculty, hostel operations, parent access, fees, exams, attendance, placements, and institutional reporting.

The project is organized as a MERN-style application with a React + Vite frontend and an Express + MongoDB backend.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [User Roles](#user-roles)
- [Backend API Modules](#backend-api-modules)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Docker Setup](#docker-setup)
- [Available Scripts](#available-scripts)
- [Security and Access Control](#security-and-access-control)
- [Important Notes](#important-notes)

## Overview

HU ERP Development provides a centralized platform for university operations. It includes separate experiences for administrators, faculty, students, wardens, gate security staff, and parents. The backend exposes modular REST APIs, while the frontend provides role-based dashboards and protected navigation.

## Tech Stack

### Frontend

- React 19
- Vite 7
- React Router
- Redux Toolkit and Redux Persist
- Axios
- Tailwind CSS
- Recharts
- Lucide React and React Icons
- React Hot Toast
- XLSX export utilities
- HTML5 QR code scanning

### Backend

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT authentication
- Cookie parser
- CORS
- Multer file uploads
- ExcelJS and Fast CSV
- Redis support
- SendGrid, Resend, and Brevo-ready email integrations
- Puppeteer Core for document/PDF workflows
- Gemini API support for AI exam workflows
- Python/OpenCV support for face verification

## Project Structure

```text
hu-erp-development/
+-- Backend/
|   +-- config/
|   +-- controllers/
|   +-- middlewares/
|   +-- models/
|   +-- routes/
|   +-- scripts/
|   +-- uploads/
|   +-- package.json
|   +-- server.js
+-- Frontend/
|   +-- src/
|   |   +-- Admin/
|   |   +-- assets/
|   |   +-- components/
|   |   +-- redux/
|   |   +-- utils/
|   +-- package.json
|   +-- vite.config.js
+-- docker-compose.yml
+-- README.md
```

## Core Features

### Admin Portal

- Admin dashboard with institutional summaries.
- Department management.
- Faculty management and faculty routine assignment.
- Student management with profile updates, soft delete, hard delete, and bulk password reset.
- Student discipline center for managing restricted or blocked access states.
- Student ID card generation and bulk downloads.
- Course and group management.
- Classroom management.
- Timetable management for groups and faculty mapping.
- Attendance management with daily reports, student reports, group reports, date-range reports, and export support.
- Assignment management with submission tracking.
- Exam management, exam registration, admit card issuing, admit card hold/cancel workflows, and result management.
- AI exam blueprint management, paper generation, review, publish, close, and score reporting.
- Faculty leave approval workflow.
- Alerts and announcement management.
- Library module with books, issue, return, and statistics.
- Warden/support ticket administration.
- General support and settings modules.
- Placement and external job management.

### Fees and Finance

- Fee program, batch, and branch setup.
- Academic fee, hostel fee, transport fee, backpaper fee, and other fee modules.
- Student fee profile mapping.
- Demand generation and demand request approval/rejection.
- Payment history and payment status management.
- Razorpay order/payment verification support.
- Bulk fee upload jobs with retry support.
- Fee report export, download, and sharing.
- Financial summary, program breakup, cashflow analytics, and student fee analytics.
- Fee calendar event management.

### Student Portal

- Student dashboard with profile, courses, attendance, and academic information.
- Course content access.
- Assignment upload/submission.
- Student course question submission.
- Attendance summary.
- Alerts and announcements.
- Hostel context, complaints, and outpass requests.
- Active outpass QR access.
- Exam registration and image upload.
- Admit card view/download.
- Student ID card download.
- AI exam attempt flow with face verification, answer saving, submission, and result view.
- Fee profile, demand letters, demand requests, payment history, and Razorpay payment flow.
- LinkedIn profile analyzer with PDF upload, report storage, and delete support.
- External job and placement views.

### Faculty Portal

- Faculty dashboard.
- Faculty profile view and edit.
- Leave application and leave history.
- Course content upload, update, and delete.
- Course syllabus upload/update.
- Student question reply workflow.
- Assignment submission review, grading, missing submission marking, and unit award sheet download.
- Course-wise student and group lookup.
- Attendance marking and attendance report access.
- Admit card verification for invigilators.
- AI exam syllabus management, paper generation, paper review, score view, and score report download.
- Faculty alerts.

### Hostel and Warden Portal

- Warden dashboard.
- Room management.
- Student hostel management.
- Hostel complaints and complaint tracking.
- Outpass management.
- Food menu module.
- Student messages.
- Warden support.
- Hostel allocation APIs.
- Hostel, room, and allocation administration.

### Gate Security Portal

- Gate security dashboard.
- Hostel outpass entry/exit validation.
- QR-based active outpass workflows.
- Student entry/exit status tracking.

### Parent Portal

- Parent login.
- Parent dashboard.
- Daily subject attendance view.
- Hostel attendance view.
- Assignment view.
- Exam view.
- Fee view.

### Placement and Jobs

- Placement module APIs.
- External job posting management.
- External job applications management.
- Student-facing external job views.

## User Roles

The application supports role-based access and protected routes for:

- Admin and admin-panel users
- Faculty
- Student
- Warden
- Gate Security
- Parent

Admin access is further controlled through module-level permissions such as department, faculty, students, exams, fees, alerts, library, settings, and reports.

## Backend API Modules

Main backend route groups:

| API Prefix | Purpose |
| --- | --- |
| `/api/user` | Login, registration, password reset, current user, admin-user utilities |
| `/api/admin` | Admin modules for academics, fees, exams, library, alerts, reports, settings |
| `/api/faculty` | Faculty dashboard, profile, attendance, course content, exams, leaves |
| `/api/student` | Student dashboard, assignments, exams, fees, hostel, alerts, LinkedIn analyzer |
| `/api/attendance` | Attendance-specific APIs |
| `/api/sections` | Section management |
| `/api/section-courses` | Section-course mapping |
| `/api/timetable` | Timetable APIs |
| `/api/placement` | Placement APIs |
| `/api/external-jobs` | External job posting and applications |
| `/api/hostels` | Hostel management |
| `/api/rooms` | Room management |
| `/api/hostel-allocation` | Hostel allocation workflows |
| `/api/warden` | Warden dashboard and hostel operations |
| `/api/gate-security` | Gate security workflows |
| `/api/parent` | Parent portal APIs |

## Environment Variables

Create environment files from the included examples:

```bash
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env
```

### Backend `.env`

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>/<database-name>"
JWT_SECRET="your_jwt_secret_key_here"

SENDGRID_API_KEY="SG.xxxxxxxx"
SENDGRID_FROM_EMAIL="no-reply@example.com"
EMAIL_FROM_NAME="Haridwar University ERP"

REDIS_URL=redis://default:<password>@<host>:<port>

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

PYTHON_BIN=python3
FACE_VERIFY_STRICT=false
```

### Frontend `.env`

```env
VITE_API_BASE_URL=/api
```

For local development with the backend running directly on port `3000`, set the frontend API base URL according to your proxy or deployment setup.

## Local Setup

### Prerequisites

- Node.js 20 or later recommended
- npm
- MongoDB database
- Optional: Redis
- Optional: Python with `opencv-python-headless` and `numpy` for strict face verification

### 1. Clone and enter the project

```bash
git clone <repository-url>
cd hu-erp-development
```

### 2. Install backend dependencies

```bash
cd Backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../Frontend
npm install
```

### 4. Configure environment files

Create and update:

- `Backend/.env`
- `Frontend/.env`

Use the `.env.example` files as the starting point.

### 5. Run backend

```bash
cd Backend
npm run dev
```

Default backend URL:

```text
http://localhost:3000
```

### 6. Run frontend

```bash
cd Frontend
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

## Docker Setup

The repository includes a `docker-compose.yml` file for running the backend and frontend containers.

```bash
docker compose up --build
```

Docker services:

| Service | Container | Port |
| --- | --- | --- |
| Backend | `hu-erp-backend` | `3000:3000` |
| Frontend | `hu-erp-frontend` | `5173:80` |

In Docker, `PYTHON_BIN` is set to:

```text
/opt/face-verify-venv/bin/python3
```

## Available Scripts

### Backend

```bash
npm run dev
npm start
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Security and Access Control

- JWT-based authentication.
- Role-based protected frontend routes.
- Backend authorization middleware for admin, faculty, student, and module-level permissions.
- CORS allowlist with local development and trusted Vercel origin support.
- Fee module security headers and rate limiting.
- Gateway signature verification for payment-related routes.
- File upload validation through Multer-based upload configurations.
- Optional strict face verification for AI exams.

## Important Notes

- The backend serves uploaded files from `/uploads`.
- `FRONTEND_URL` can contain comma-separated allowed origins.
- `FACE_VERIFY_STRICT=false` allows a local-development fallback when OpenCV is unavailable.
- Admin modules depend on permission metadata. Use the permission/backfill utilities where required.
- Keep real credentials out of source control and use `.env` files for secrets.

## Suggested Production Checklist

- Set a strong `JWT_SECRET`.
- Configure production MongoDB and Redis URLs.
- Add only trusted frontend domains to `FRONTEND_URL`.
- Configure verified email sender credentials.
- Configure Cloudinary credentials for image uploads.
- Configure Gemini API credentials if AI exam generation/evaluation is enabled.
- Configure payment gateway credentials and webhook verification.
- Run frontend build before deployment:

```bash
cd Frontend
npm run build
```
