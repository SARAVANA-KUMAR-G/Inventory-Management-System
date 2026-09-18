# Inventory Management System V1

A full-stack inventory management application for managing products,
categories, stock movement, sales, users, and operational reports
through a centralized web interface.

**Live Demo:** https://inventory-management-system-pied-five.vercel.app\
**Repository:**
https://github.com/SARAVANA-KUMAR-G/Inventory-Management-System

## Overview

Inventory Management System V1 is a production-deployed web application
built around the core workflows of a small-to-medium inventory
operation.

### Core capabilities

-   JWT authentication with Admin and Staff roles
-   Product and category management
-   Stock In and Stock Out / adjustments
-   Stock transaction ledger
-   Point of Sale (POS)
-   Sales history and returns
-   Dashboard monitoring
-   Reports and analytics
-   CSV product import/export
-   Responsive smartphone, tablet, and desktop UI

## Technology Stack

### Frontend

-   React 18
-   Vite
-   Tailwind CSS
-   React Router
-   Axios

### Backend

-   Node.js
-   Express.js
-   Prisma ORM
-   JWT
-   bcryptjs
-   Zod
-   Helmet
-   CORS

### Database

-   PostgreSQL

### Deployment

-   Vercel --- frontend
-   Render --- backend API
-   Render PostgreSQL --- database

## Architecture

``` text
User
 │
 ▼
Vercel
React + Vite Frontend
 │ HTTPS / REST API
 ▼
Render
Node.js + Express API
 │ Prisma ORM
 ▼
Render PostgreSQL
```

The backend API is versioned under `/api/v1`.

## Main Modules

### Authentication & Users

-   JWT-based authentication
-   bcrypt password hashing
-   Admin and Staff roles
-   User activation/deactivation
-   Protected API routes
-   Role-based authorization

### Products & Categories

-   Product CRUD
-   Unique SKU
-   Optional barcode
-   Categories
-   Cost and selling prices
-   Reorder levels
-   Search and filtering
-   Stock status indicators

### Inventory

-   Stock receiving
-   Stock-out operations
-   Stock adjustments with reasons
-   Automatic stock balance updates
-   Stock transaction ledger
-   Negative-stock prevention

All normal stock-changing operations use Prisma database transactions so
stock updates and their corresponding ledger records succeed or roll
back together.

### Point of Sale

-   Search by product name, SKU, or barcode
-   Cart and quantity management
-   Discount and tax fields
-   CASH, CARD, UPI, and OTHER payment methods
-   Atomic stock deduction
-   Unique invoice numbers
-   Browser-printable receipts

### Sales

-   Sales history
-   Invoice details
-   Sale item breakdown
-   Payment method tracking
-   Sale returns
-   Stock restoration after returns

### Dashboard & Reports

-   Total products
-   Low-stock and out-of-stock counts
-   Today's sales
-   Inventory value
-   Sales trend
-   Top-selling products
-   Recent transactions and sales
-   Operational reports with filters

### Responsive UI

The frontend is designed for: - 320px+ smartphones - 375px--430px
smartphones - 768px--1024px tablets - 1280px+ desktops

Mobile UX includes a slide-over navigation drawer, responsive cards,
mobile POS catalog/cart switching, sticky checkout, responsive
forms/modals, and contained scrolling for genuinely wide report tables.

## Database Model

The V1 database contains six core models:

``` text
User
 ├── Sales
 └── StockTransactions

Category
 └── Products
      ├── StockTransactions
      └── SaleItems
             └── Sale
```

Models: - `User` - `Category` - `Product` - `StockTransaction` -
`Sale` - `SaleItem`

## Roles

### ADMIN

Administrative access to management functions including products,
categories, stock, sales, reports, users, and dashboard operations.

### STAFF

Access to the operational workflows permitted for staff, including
inventory and sales operations.

## Project Structure

``` text
Inventory-Management-System/
├── inventory-management-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   └── ...
│   ├── public/
│   └── package.json
│
├── inventory-management-backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   └── ...
│   └── package.json
│
├── .gitignore
└── README.md
```

## Local Development

### Prerequisites

-   Node.js
-   npm
-   PostgreSQL

### Backend

``` bash
cd inventory-management-backend
npm install
```

Create `.env`:

``` env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/inventory_management"
JWT_ACCESS_SECRET="your-development-secret"
JWT_ACCESS_EXPIRES_IN="24h"
FRONTEND_ORIGIN="http://localhost:5173"
API_PREFIX="/api/v1"
BCRYPT_ROUNDS=10
```

Then:

``` bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

API:

``` text
http://localhost:5000/api/v1
```

### Frontend

``` bash
cd inventory-management-frontend
npm install
```

Create `.env`:

``` env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Then:

``` bash
npm run dev
```

Frontend:

``` text
http://localhost:5173
```

## Demo Credentials

### Admin

``` text
Email: admin@inventory.com
Password: Admin@123456
```

### Staff

``` text
Email: staff@inventory.com
Password: Staff@123456
```

These credentials are for the demo/seed environment and should not be
used for a real business deployment.

## Environment Variables

### Backend

  Variable                  Purpose
  ------------------------- ------------------------------
  `NODE_ENV`                Application environment
  `PORT`                    API server port
  `DATABASE_URL`            PostgreSQL connection string
  `JWT_ACCESS_SECRET`       JWT signing secret
  `JWT_ACCESS_EXPIRES_IN`   JWT expiration
  `FRONTEND_ORIGIN`         Allowed frontend origin
  `API_PREFIX`              API route prefix
  `BCRYPT_ROUNDS`           Password hashing cost

### Frontend

  Variable              Purpose
  --------------------- ----------------------
  `VITE_API_BASE_URL`   Backend API base URL

Never commit real `.env` files, database credentials, or JWT secrets.

## Security

V1 includes: - bcrypt password hashing - JWT authentication - protected
API routes - role-based authorization - input validation - Helmet
security headers - CORS configuration - environment-based secrets -
database constraints - transactional stock operations - negative-stock
prevention - no password hashes in API responses

The V1 intentionally avoids infrastructure-heavy features such as
microservices, distributed sessions, refresh-token families, event
sourcing, and message brokers.

## Testing & Verification

The deployed V1 was verified across: - Admin login - Staff login -
Role-based access - Product and category management - CSV operations -
Stock In - Stock Out / adjustments - Negative-stock prevention - POS
sales - Stock transaction ledger - Sale returns - Dashboard - Reports

The frontend production build was verified with:

``` bash
npm run build
```

Responsive layouts were tested across smartphone, tablet, and desktop
viewport sizes.

## Deployment

### Frontend

Live on Vercel:

https://inventory-management-system-pied-five.vercel.app

Production variable:

``` env
VITE_API_BASE_URL=https://inventory-management-system-api-o2b1.onrender.com/api/v1
```

### Backend

Live on Render:

https://inventory-management-system-api-o2b1.onrender.com

### Database

PostgreSQL is hosted on Render. Prisma migrations are applied during
deployment with:

``` bash
npx prisma migrate deploy
```

## V1 Scope

### Included

-   Authentication
-   Users
-   Categories
-   Products
-   Stock In
-   Stock Out / Adjustments
-   Sales / POS
-   Stock Transactions
-   Dashboard
-   Reports
-   CSV import/export
-   Responsive UI

### Intentionally outside V1

-   Microservices
-   Redis/Kafka
-   Real-time Socket.IO infrastructure
-   Complex permission-management systems
-   Refresh-token/session infrastructure
-   Supplier and purchase-order subsystems
-   Customer CRM
-   External payment gateways
-   Multi-branch inventory
-   Enterprise audit-log infrastructure
-   Advanced inventory valuation
-   Server-side PDF generation

## Future Improvements

Possible future iterations: - Supplier and purchase-order management -
Barcode scanner integration - Advanced analytics - Notifications -
Audit/activity logs - Multi-branch inventory - Customer management -
Advanced returns/refunds - Automated backups - Granular permissions -
Real-time inventory updates

## Screenshots

Suggested screenshots for the repository: - Login - Dashboard -
Products - POS - Stock operations - Reports - Mobile UI

## Author

**Saravana Kumar G.**\
B.Tech Information Technology

GitHub: https://github.com/SARAVANA-KUMAR-G/Inventory-Management-System

## License

This project is currently intended as a portfolio/project demonstration.
Add an explicit open-source license if the repository is later intended
for redistribution or external contributions.
