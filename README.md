# Smart Inventory Management System (SIMS)

Enterprise-grade Inventory and Point-of-Sale (POS) platform built strictly in accordance with the specifications in the `Documentation/` directory:
- **Engineering Specification v1.0**
- **Backend Architecture & Project Structure Specification v1.0**
- **Database & ERD Specification v1.0**
- **Frontend Architecture & State Management Specification v1.0**
- **REST API Specification v1.0**

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Chart.js |
| **Backend** | Node.js 22 LTS, Express.js (Modular Monolith) |
| **Database** | PostgreSQL 18 with Prisma ORM (ACID Transactions) |
| **Realtime** | Socket.io (Realtime Stock Invalidation & Alerts) |
| **Auth** | JWT Access Token + Secure HttpOnly Refresh Cookie Rotation |
| **Reporting & Files** | PDFKit (PDF Invoices), XLSX (Excel Catalog & Analytics Exports) |

---

## 🚀 Quick Start Guide

### 1. Database Setup
Ensure PostgreSQL is running locally on port 5432. The database is initialized as `smart_inventory_db`.
Credentials configured in `inventory-management-backend/.env`:
```env
DATABASE_URL="postgresql://postgres:SKpubg123@localhost:5432/smart_inventory_db?schema=public"
```

### 2. Running Backend (API on Port 5000)
```bash
cd inventory-management-backend
npm start
```
*Health Check*: [http://localhost:5000/health](http://localhost:5000/health)  
*API Base Path*: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)

### 3. Running Frontend (Vite on Port 5173)
```bash
cd inventory-management-frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 👤 Seed User Accounts

The system comes pre-populated with realistic inventory catalog, suppliers, customers, system settings, and 3 standard role accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@smartinventory.com` | `Admin@123456` | Full System Administration, RBAC, Settings, Audit Logs |
| **Manager** | `manager@smartinventory.com` | `Manager@123456` | Catalog, Stock In/PO, Adjustments, Sales, Reports |
| **Cashier** | `cashier@smartinventory.com` | `Cashier@123456` | POS / Complete Sales, Catalog View, Dashboard View |

*(Quick-fill buttons are available on the Login screen for 1-click credential switching)*

---

## 📦 Key System Modules & Features

### 1. Point of Sale (POS) & Stock Out
- Search products by name, SKU, or Barcode with instant stock level badges.
- Keyboard shortcuts: `F2` focus search, `F9` checkout modal, `Esc` cancel.
- Cart quantity adjustment, line totals, and order-level discount (% or fixed).
- Multiple payment methods: **Cash** (with change calculator), **Card**, and **UPI / QR**.
- Hold & Recall orders without losing cashier state.
- Instant printable receipt modal & direct PDF invoice download.
- **ACID Transaction Guarantee**: Stock deduction, SaleItem snapshots, and invoice allocation (`INV-YYYY-XXXXXX`) commit in a single database transaction.

### 2. Stock In & Purchase Orders
- Vendor directory with PO history.
- Purchase order creation with dynamic line items and auto-calculated totals.
- **Stock Receiving Workflow**: Supports full or partial item receipts; updates product `current_stock` only upon verified receipt and records `PURCHASE_RECEIPT` movements.

### 3. Inventory Movements & Ledger
- **Immutable Ledger**: Every stock change creates a permanent `StockTransaction` record.
- Manual Adjustments: `MANUAL_IN`, `MANUAL_OUT`, or `ADJUSTMENT` with recorded reasons (Damaged, Expired, Write-off, Physical Count).
- Realtime Socket.io distribution (`inventory.stock.updated`, `inventory.low_stock`).

### 4. Product Catalog & Categories
- SKU and Barcode uniqueness validation.
- Reorder alert threshold with visual badges (In Stock, Low Stock, Out of Stock).
- Hierarchical category organization.
- Excel catalog bulk export.

### 5. Sales Orders & Returns
- Searchable sales order history by invoice number, date, customer, payment method.
- Return/Refund processor: validates returned quantities against eligible quantities, restores stock automatically, and marks status as `PARTIALLY_RETURNED` or `RETURNED`.

### 6. Reports & Analytics
- **Stock Summary**: Inventory volume, cost value vs retail value by item.
- **Sales Report**: Revenue, COGS, and gross profit by date range.
- **Profit & Margins**: Periodic margin % breakdown.
- **Inventory Valuation**: Grouped asset value by product category.
- Excel export for all report datasets.

### 7. Staff & Access Control (RBAC)
- Fine-grained permission system (`products.create`, `inventory.adjust`, `sales.create`, etc.).
- Admin panel to add staff, assign roles (`Admin`, `Manager`, `Cashier`), and activate/deactivate accounts.

### 8. System Settings
- Shop name, address, tax registration number, currency symbol, default tax rate (8.5%), and invoice numbering prefix.

