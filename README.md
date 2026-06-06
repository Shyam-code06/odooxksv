# VendorBridge ERP

VendorBridge is an enterprise-grade Procurement and Vendor Management ERP system designed for streamlined Request for Quotation (RFQ) workflows, quotation evaluation, automated Purchase Order (PO) dispatch, invoice tracking, and live audit trails.

---

## 🚀 Key Features

- **Role-Based Access Control (RBAC)**: Tailored dashboards and menu access for four distinct system roles:
  - **Admin**: Full system configurations, user administration, and a live vertical timeline tracking procurement activities.
  - **Manager**: Workflow approval hub for publishing RFQs and accepting quotation evaluations.
  - **Procurement Officer**: RFQ creation, vendor selection, PO generation, and invoice tracking.
  - **Vendor**: Self-registration portal, RFQ invitations, quotation bidding, PO acknowledgement, and automated invoicing.
- **Strict Data Validations**: Unified input validation schemas on client and server ensuring correct email formats (rejecting incomplete structures) and enforcing exactly 10-digit mobile numbers.
- **Approval Workflow**: Dual-stage approvals requiring Manager sign-off before publishing draft RFQs and final quotation acceptances.
- **Forgot Password Self-Service**: Recovery wizard using temporary 6-digit email One-Time Passwords (OTP) with immediate refresh token revocation for multi-device session security.
- **Printable Invoices**: Built-in styling optimizations for printing and downloading invoices directly to PDF.
- **Live Notifications**: Navbar-integrated real-time notification badge alert feed with visual indicators for unread alerts.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), React Hook Form, Yup validation, TanStack React Query, Axios, Bootstrap 5.
- **Backend**: Node.js, Express.js, JSON Web Tokens (JWT) authentication, Node-mailer.
- **Database**: PostgreSQL (relational schema, foreign key triggers, indexing, dynamic search filters).

---

## 📁 Repository Structure

```
odooxksv/
├── client/                 # React Frontend Application
│   ├── src/
│   │   ├── common/         # Contexts, hooks, and reusable UI components
│   │   ├── layouts/        # Sidebar, Navbar, and layout shells
│   │   ├── pages/          # Login, Register, RFQs, Invoices, Approvals, etc.
│   │   └── App.jsx         # Routing configuration
│   └── package.json
└── server/                 # Express Backend Server
    ├── src/
    │   ├── common/         # BaseRepository, BaseService, and BaseController
    │   ├── config/         # Database and middleware configuration
    │   ├── database/       # schema.sql, seed.sql, and migrate scripts
    │   └── modules/        # Auth, User, RFQ, Quotation, PO, Invoices, notifications
    ├── .env                # Server environment configuration variables
    └── package.json
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (running locally or remotely)

### 2. Database Setup
Create a PostgreSQL database named `vendorbridge` (or configure your choice in the `.env` file).

### 3. Server Configuration
Create/verify the environment file at `server/.env`:
```ini
PORT=5000
DBHOST=localhost
DBPORT=5432
DBUSER=postgres
DBPASSWORD=yourpassword
DBNAME=vendorbridge

JWTSECRET=supersecurejwtsecretkeyvendorbridge2026
JWTEXPIRESIN=15m
JWTREFRESHSECRET=supersecurerefreshjwtsecretkeyvendorbridge2026
JWTREFRESHEXPIRESIN=7d

# Node-mailer configuration (optional - defaults to console logs simulation if empty)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Running Migrations & Seeding
From the `server` directory, run the database migrations and seed script:
```bash
npm run migrate
```
This initializes the database schemas, indexes, permissions, and inserts the default administrator account (`admin` / password `Admin@123`).

---

## 🏃 Running the Application

Open two terminals and start both services:

### Start the Server (Backend)
```bash
cd server
npm install
npm run dev
```
Starts backend API on `http://localhost:5000`.

### Start the Client (Frontend)
```bash
cd client
npm install
npm run dev
```
Starts development server on `http://localhost:5173`.