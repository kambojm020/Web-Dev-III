# E-Commerce and Inventory Management System (Backend API)

An enterprise-grade, academic capstone backend built with Node.js, Express, MongoDB/Mongoose, and Socket.IO. Designed following layered MVC architecture, enforcing robust Role-Based Access Control (RBAC), strict concurrency-safe inventory checkouts, aggregation reporting, real-time WebSocket notifications, and automated test coverage.

---

## Table of Contents
1. [Project Overview & Key Features](#project-overview--key-features)
2. [Technology Stack](#technology-stack)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
5. [Environment Variables](#environment-variables)
6. [Database Seeding & Demo Accounts](#database-seeding--demo-accounts)
7. [Running the Application & Tests](#running-the-application--tests)
8. [Folder & Architectural Structure](#folder--architectural-structure)
9. [Database Design, Schemas & Indexes](#database-design-schemas--indexes)
10. [Stock Concurrency Strategy](#stock-concurrency-strategy)
11. [Order Status Lifecycle Transition Map](#order-status-lifecycle-transition-map)
12. [Real-Time Events & WebSockets](#real-time-events--websockets)
13. [Security & Authentication Architecture](#security--authentication-architecture)
14. [Aggregation Pipelines](#aggregation-pipelines)
15. [API Documentation Summary](#api-documentation-summary)
16. [Postman Collection & Testing](#postman-collection--testing)
17. [Simulated Payment Disclaimer](#simulated-payment-disclaimer)

---

## Project Overview & Key Features

- **Layered Clean Architecture**: Controllers only orchestrate HTTP requests and responses; all business logic is isolated in reusable service modules. Controllers never touch models directly.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions separating `customer`, `seller`, and `admin` roles.
- **Zero-Negative Concurrency Stock Control**: Prevents inventory overselling during simultaneous checkouts using atomic conditional MongoDB updates with automatic rollback.
- **Double-Cancellation Protection**: Atomic order state transitions guarantee stock cannot be restored more than once.
- **Price Snapshots**: Orders preserve historical price and seller snapshots at the moment of checkout, unaffected by subsequent product price updates.
- **Aggregation Reports**: 4 aggregation pipelines for sales summaries, top-selling products, category inventory valuations, and category revenue breakdowns.
- **Decoupled Real-Time Architecture**: Built-in Node.js `EventEmitter` handles asynchronous events (`order.placed`, `order.status.changed`, `stock.low`), broadcasting room-scoped notifications over `Socket.IO`.
- **Automated Integration Testing**: 43 test assertions using Jest, Supertest, and MongoMemoryServer covering positive, negative, validation, concurrency, and RBAC flows.

---

## Technology Stack

| Layer / Concern | Technology |
|---|---|
| Runtime Environment | Node.js (v18+ LTS, tested on v24) |
| Web Framework | Express.js 4.x |
| Database & ODM | MongoDB & Mongoose 8.x |
| Authentication | JSON Web Tokens (`jsonwebtoken`) & SHA-256 / Bcrypt (`bcryptjs`) |
| Real-Time Communication | Socket.IO 4.x & Node.js `EventEmitter` |
| Security Middlewares | Helmet, CORS, Express-Rate-Limit |
| Request Validation | Express-Validator |
| Logging | Morgan HTTP Logger |
| Testing Suite | Jest, Supertest, mongodb-memory-server |

---

## Prerequisites

- **Node.js**: `v18.x` or later (LTS recommended)
- **NPM**: `v9.x` or later
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas cluster URI. *(Note: Automated integration tests run with an embedded in-memory MongoDB server and require no external database).*

---

## Installation & Setup

1. **Clone or navigate to the repository directory**:
   ```bash
   cd Capstone_Web-Dev-III
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## Environment Variables

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `MONGO_URI` | MongoDB connection connection string | `mongodb://localhost:27017/ecommerce_capstone` |
| `JWT_ACCESS_SECRET` | Secret key for signing short-lived access tokens (min 32 chars) | `your_super_secret_jwt_access_key_min_32_chars` |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `your_super_secret_jwt_refresh_key_min_32_chars` |
| `JWT_ACCESS_EXPIRES` | Expiration time for access token | `15m` |
| `JWT_REFRESH_EXPIRES` | Expiration time for refresh token | `7d` |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for hashing passwords | `10` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `*` |
| `LOW_STOCK_DEFAULT` | Default threshold triggering low-stock alert | `5` |

---

## Database Seeding & Demo Accounts

To reset the database with pre-populated demo data (1 admin, 2 sellers, 3 customers, 4 categories, 16 products, 2 coupons, and 2 sample orders):

```bash
npm run seed
```

### Pre-Configured Demo Credentials

| Role | Email | Password | Intended Test Usage |
|---|---|---|---|
| **Admin** | `admin@ecommerce.test` | `Admin@123` | System management, user activation, categories, reports |
| **Seller 1** | `seller1@techgear.test` | `Seller@123` | Electronics & Sports items, stock adjustments, order fulfillment |
| **Seller 2** | `seller2@urbanwear.test` | `Seller@123` | Apparel & Home items, inventory management |
| **Customer 1** | `customer1@example.test` | `Customer@123` | Cart operations, checkout, coupon application, reviews |
| **Customer 2** | `customer2@example.test` | `Customer@123` | Active customer with past delivered orders |
| **Customer 3** | `customer3@example.test` | `Customer@123` | Fresh customer account |

---

## Running the Application & Tests

- **Run in Development Mode (with hot reloading)**:
  ```bash
  npm run dev
  ```
- **Run in Production Mode**:
  ```bash
  npm start
  ```
- **Execute Automated Integration Tests**:
  ```bash
  npm test
  ```

---

## Folder & Architectural Structure

```
Capstone_Web-Dev-III/
├── seeds/
│   └── seed.js                    # Database seeding script with realistic data
├── tests/
│   ├── setup.js                   # MongoMemoryServer lifecycle & Jest setup
│   ├── health.test.js             # Health check & not-found handler tests
│   ├── auth.test.js               # Registration, login, token rotation, logout
│   ├── user.test.js               # Profile updates, RBAC, admin user status
│   ├── catalog_cart.test.js       # Categories, products, seller scopes, cart logic
│   ├── order_checkout.test.js     # Checkout, concurrency test, transitions, cancel
│   └── reports_inventory_reviews.test.js # Aggregations, low-stock alerts, reviews
├── postman/
│   ├── ecommerce.postman_collection.json  # Complete Postman requests collection
│   └── ecommerce.postman_environment.json # Postman environment template
├── src/
│   ├── config/
│   │   ├── env.js                 # Environment validation and loading
│   │   └── db.js                  # Mongoose MongoDB connection manager
│   ├── models/
│   │   ├── User.js                # User schema, password hashing, token validation
│   │   ├── Category.js            # Category schema with auto-slugification
│   │   ├── Product.js             # Product schema, stock tracking, compound indexes
│   │   ├── Cart.js                # Customer shopping cart with item snapshots
│   │   ├── Order.js               # Order schema, status history, price snapshots
│   │   ├── Coupon.js              # Coupon schema, discount calculators, validity
│   │   └── Review.js              # Product reviews with rating recalculation hook
│   ├── routes/
│   │   ├── index.js               # Main API route aggregator mounted at /api
│   │   ├── health.routes.js       # Health and system diagnostics route
│   │   ├── auth.routes.js         # Register, login, refresh, logout
│   │   ├── user.routes.js         # User profile and admin user management
│   │   ├── category.routes.js     # Category CRUD
│   │   ├── product.routes.js      # Product search, catalog, and reviews
│   │   ├── seller.routes.js       # Dedicated seller product queries
│   │   ├── cart.routes.js         # Shopping cart operations & coupon previews
│   │   ├── order.routes.js        # Checkout, order list, status updates, cancellation
│   │   ├── coupon.routes.js       # Admin coupon administration
│   │   ├── inventory.routes.js    # Inventory alerts and summaries
│   │   └── report.routes.js       # Aggregation report endpoints
│   ├── controllers/               # Request handling, delegating to services
│   ├── services/                  # Pure business logic layer
│   ├── middlewares/
│   │   ├── auth.js                # JWT Bearer token authentication & RBAC authorize
│   │   ├── errorHandler.js        # Central error handler mapping Cast, Validation, JWT
│   │   ├── notFound.js            # 404 handler for unmatched routes
│   │   ├── rateLimiter.js         # IP rate limiting for auth endpoints
│   │   ├── requestLogger.js       # Morgan HTTP request logger
│   │   └── validate.js            # Express-validator result collector
│   ├── validators/                # Validation schemas per resource
│   ├── events/
│   │   └── index.js               # Node.js EventEmitter instance and listeners
│   ├── sockets/
│   │   └── index.js               # Socket.IO authentication and room broadcaster
│   ├── utils/
│   │   ├── apiError.js            # Custom ApiError class with status codes
│   │   ├── apiResponse.js         # Standard JSON response envelope helper
│   │   ├── asyncHandler.js        # Async try/catch wrapper
│   │   └── pagination.js          # Pagination helper with metadata
│   ├── app.js                     # Express application configuration
│   └── server.js                  # HTTP server & Socket.IO initialization
├── .env.example
├── .gitignore
└── package.json
```

---

## Database Design, Schemas & Indexes

### Schema Relationships
```
[User] (customer, seller, admin)
   ├── 1:1  ──> [Cart] ──> [CartItems] ──> (ref: Product)
   ├── 1:M  ──> [Order] (as customer)
   ├── 1:M  ──> [Product] (as seller)
   └── 1:M  ──> [Review] (as reviewer)

[Category]
   └── 1:M  ──> [Product]

[Order]
   ├── [OrderItems] ──> (ref: Product, ref: User [seller])
   └── [StatusHistory] ──> (ref: User [changedBy])
```

### Purpose of Configured Indexes

1. **Product Collection**:
   - `{ category: 1, price: 1 }`: Optimizes customer catalog browsing when filtering products by category and sorting/filtering by price range.
   - `{ seller: 1, stock: 1 }`: Accelerates seller queries when managing their own products and detecting low-stock items.
   - `{ name: "text", description: "text" }`: Full-text search index powering the `/api/products?q=keyword` text search endpoint.
   - `{ slug: 1 } (unique)`: Guarantees unique SEO-friendly product URLs and accelerates single-product lookups.

2. **Order Collection**:
   - `{ customer: 1, createdAt: -1 }`: Enables instant retrieval of a customer's order history sorted from most recent to oldest.
   - `{ "items.seller": 1, status: 1 }`: Allows sellers to swiftly filter orders containing their merchandise by operational status (e.g., finding all `paid` or `processing` orders awaiting shipment).
   - `{ status: 1, createdAt: -1 }`: Powers administrative dashboards and aggregation reports that filter orders by lifecycle status across specified date ranges.

3. **Cart Collection**:
   - `{ user: 1 } (unique)`: Enforces a strict one-to-one constraint between a customer and their active shopping cart.

4. **Review Collection**:
   - `{ user: 1, product: 1 } (unique)`: Guarantees that a user can submit only one review per product, rejecting duplicate submissions with HTTP 409 Conflict.

---

## Stock Concurrency Strategy

### The Problem
In high-concurrency environments (e.g., flash sales), multiple customers simultaneously submit checkout requests for the same product. Standard `find -> modify -> save` approaches suffer from race conditions (read-modify-write conflicts) that result in overselling and negative stock.

### The Solution: Atomic Conditional Decrements with Rollback
We implemented MongoDB atomic conditional updates directly in `src/services/order.service.js`:

```javascript
const updateResult = await Product.updateOne(
  {
    _id: product._id,
    stock: { $gte: cartItem.quantity }, // Condition: stock must be >= requested quantity
    isActive: true,
  },
  {
    $inc: { stock: -cartItem.quantity }, // Atomic decrement
  }
);
```

### Why this approach was chosen:
1. **Universally Portable**: Works identically on standalone MongoDB instances, in-memory test databases (`mongodb-memory-server`), and replica sets, whereas multi-document transactions require replica set topologies and carry higher transaction coordinator latency.
2. **Strict Invariant**: MongoDB executes single-document operations atomically at the storage engine level. If available stock is 2 and two requests arrive for 2 units simultaneously, only one will match the `{ stock: { $gte: 2 } }` query filter and increment the stock. The second request returns `modifiedCount: 0`.
3. **Rollback Safety**: When checking out a cart with multiple items, if item #3 fails due to insufficient stock, the service catches the condition and immediately reverses/restores the decrements made for items #1 and #2 before throwing HTTP `409 Conflict`.
4. **Verified by Automated Concurrency Test**: Validated in `tests/order_checkout.test.js` where 10 simultaneous parallel checkouts compete for 5 units of stock; exactly 5 succeed (HTTP 201) and 5 fail (HTTP 409), with stock ending at exactly 0 and never negative.

---

## Order Status Lifecycle Transition Map

Order status transitions are strictly enforced in `OrderService` using a finite-state transition map:

```
  ┌─────────┐       ┌──────┐       ┌────────────┐       ┌─────────┐       ┌───────────┐
  │ pending │ ────> │ paid │ ────> │ processing │ ────> │ shipped │ ────> │ delivered │ [Terminal]
  └─────────┘       └──────┘       └────────────┘       └─────────┘       └───────────┘
       │                │                │
       ▼                ▼                ▼
  ┌─────────────────────────────────────────────┐
  │                  cancelled                  │ [Terminal]
  └─────────────────────────────────────────────┘
```

### Transition & Cancellation Rules:
- **Customer Cancellation**: Customers may cancel only while the order is in `pending` or `paid` status. Once an order enters `processing`, `shipped`, or `delivered`, customer cancellation is rejected.
- **Seller / Admin Cancellation**: Sellers and admins can cancel orders while in `pending`, `paid`, or `processing` status.
- **Stock Restoration**: Cancelling an order restores inventory back to the database. Double-cancellation is strictly guarded by atomic query:
  `Order.findOneAndUpdate({ _id: orderId, status: { $in: ['pending', 'paid', 'processing'] } }, ...)`
  If the order was already cancelled, the query returns `null` and rejects the request with HTTP `409 Conflict`.
- **Terminal States**: `delivered` and `cancelled` are terminal. Any transition attempts from these states are rejected with HTTP 409.

---

## Real-Time Events & WebSockets

The backend decouples business logic from notifications using Node's `EventEmitter` (`src/events/index.js`) and `Socket.IO` (`src/sockets/index.js`).

### Socket Authentication
Clients authenticate during handshake by supplying their JWT access token:
```javascript
const socket = io("http://localhost:5000", {
  auth: { token: "YOUR_ACCESS_TOKEN" }
});
```

### Socket Rooms
Upon successful authentication, clients automatically join isolated rooms:
- `user:<userId>`: Joined by the authenticated user.
- `role:seller`: Joined by all sellers.
- `seller:<sellerId>`: Joined by the individual seller to receive seller-scoped alerts.
- `role:admin`: Joined by administrators.

### Event Catalog

| Event Name | Channel / Room | Trigger | Payload Shape |
|---|---|---|---|
| `order:placed` | `seller:<sellerId>` | Emitted when customer completes checkout | `{ orderId, orderNumber, items: [...], sellerTotal, createdAt }` |
| `order:statusChanged` | `user:<customerId>` | Emitted when order status changes | `{ orderId, orderNumber, status, note, updatedAt }` |
| `inventory:lowStock` | `seller:<sellerId>` & `role:admin` | Emitted when product stock $\le$ `lowStockThreshold` | `{ productId, name, stock, threshold, sellerId }` |

---

## Security & Authentication Architecture

1. **Password Security**: Passwords hashed using `bcryptjs` with configurable salt rounds (default 10). The `passwordHash` field has `select: false` on the Mongoose schema, preventing accidental exposure in queries.
2. **Access & Refresh Token Flow**:
   - **Access Token**: Short-lived (15 minutes), verified on every authenticated request.
   - **Refresh Token**: Long-lived (7 days). Stored in the database **only as a SHA-256 hash** (`refreshTokenHash` with `select: false`).
   - **Token Rotation**: On each `/api/auth/refresh` call, the existing refresh token is invalidated, and a newly generated refresh token hash replaces the old one.
   - **Bcrypt 72-Byte Protection**: Because JWT tokens exceed bcrypt's 72-byte truncation limit, refresh tokens are hashed using SHA-256 and compared using constant-time `crypto.timingSafeEqual`, preventing timing attacks and collision truncations.
3. **NoSQL Injection Defense**: Queries use strict field allowlists for filtering and sorting. Raw client query objects are never passed directly to Mongoose queries.
4. **Deactivated Users**: The authentication middleware rejects deactivated accounts (`isActive: false`) with HTTP 403 Forbidden.

### RBAC Permission Matrix

| Endpoint Group | Customer | Seller | Admin | Public |
|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/register` | Self | Self | ❌ (Seeded only) | ✅ |
| `GET /api/categories`, `GET /api/products` | ✅ | ✅ | ✅ | ✅ |
| `POST/PATCH/DELETE /api/categories` | ❌ | ❌ | ✅ | ❌ |
| `POST /api/products` | ❌ | Own | All | ❌ |
| `PATCH/DELETE /api/products/:id` | ❌ | Own only (403 if other) | All | ❌ |
| `GET /api/cart/*` | Own | ❌ (403) | ❌ (403) | ❌ |
| `POST /api/orders` (Checkout) | ✅ | ❌ (403) | ❌ (403) | ❌ |
| `GET /api/orders` | Own only | Own items only | All | ❌ |
| `PATCH /api/orders/:id/status` | ❌ | Own order items | All | ❌ |
| `POST /api/orders/:id/cancel` | Own (pending/paid) | Own items | All | ❌ |
| `GET /api/reports/*` | ❌ (403) | Own revenue only | All | ❌ |

---

## Aggregation Pipelines

All aggregation pipelines are isolated in `src/services/report.service.js` with documented stages:

1. **Sales Summary (`/api/reports/sales-summary`)**:
   Filters by non-cancelled orders and optional date ranges, unwinds line items, applies seller-level filtering if called by a seller, groups by order ID to calculate order totals, groups by time period (day/month) to calculate `totalRevenue`, `orderCount`, and `averageOrderValue`, and sorts chronologically.
2. **Best Sellers (`/api/reports/best-sellers`)**:
   Deconstructs line items, aggregates total `quantitySold` and `totalRevenue` per product, executes a `$lookup` to the `products` collection for stock and live pricing, sorts by revenue descending, and limits to top N products.
3. **Inventory Valuation by Category (`/api/reports/inventory-summary`)**:
   Groups active products by category ID, calculates `totalStockUnits`, evaluates `$cond` expressions for `outOfStockCount` and `lowStockCount`, computes total category stock valuation ($\sum \text{price} \times \text{stock}$), looks up category names, and sorts alphabetically.
4. **Category Sales Breakdown (`/api/reports/category-sales`)**:
   Unwinds order items, looks up the product's assigned category, groups by category ID calculating aggregate revenue and unit sales, looks up category display names, and sorts by revenue descending.

---

## API Documentation Summary

Base URL: `http://localhost:5000/api`

Standard Response Envelope:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
}
```

Standard Error Envelope:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ { "field": "email", "message": "Valid email is required" } ]
}
```

### Key Endpoints

| Resource | Method | Path | Auth / Role | Description |
|---|---|---|---|---|
| **Health** | `GET` | `/health` | Public | System status, database connection, uptime |
| **Auth** | `POST` | `/auth/register` | Public | Register customer or seller (`admin` rejected) |
| **Auth** | `POST` | `/auth/login` | Public | Authenticate; returns `accessToken` & `refreshToken` |
| **Auth** | `POST` | `/auth/refresh` | Public | Rotates refresh token and returns fresh access token |
| **Auth** | `POST` | `/auth/logout` | Authenticated | Revokes current refresh token hash in database |
| **Users** | `GET` | `/users/me` | Authenticated | Current user profile details |
| **Users** | `PATCH` | `/users/me` | Authenticated | Update name or phone (role changes rejected) |
| **Users** | `GET` | `/users` | Admin | Paginated user directory |
| **Users** | `PATCH` | `/users/:id/status`| Admin | Activate or deactivate user (`isActive`) |
| **Categories**| `GET` | `/categories` | Public | List active categories |
| **Categories**| `POST` | `/categories` | Admin | Create category |
| **Categories**| `DELETE`| `/categories/:id` | Admin | Delete category (rejected with 409 if products exist) |
| **Products** | `GET` | `/products` | Public | Browse products with search `q`, filters & sorting |
| **Products** | `POST` | `/products` | Seller, Admin | Create product |
| **Products** | `PATCH`| `/products/:id/stock`| Seller, Admin | Update or adjust stock level |
| **Products** | `POST` | `/products/:id/reviews`| Customer | Submit rating (1-5) and review |
| **Cart** | `GET` | `/cart` | Customer | View items, subtotal, and stock warnings |
| **Cart** | `POST` | `/cart/items` | Customer | Add product to cart (validates against stock) |
| **Cart** | `PATCH`| `/cart/items/:productId`| Customer| Update item quantity (0 removes item) |
| **Cart** | `POST` | `/cart/coupon` | Customer | Validate & preview coupon discount |
| **Orders** | `POST` | `/orders` | Customer | Atomic checkout, stock decrement, simulated payment |
| **Orders** | `GET` | `/orders` | Authenticated | Own orders (customer), seller items (seller), all (admin)|
| **Orders** | `PATCH`| `/orders/:id/status`| Seller, Admin| Move order through lifecycle transition map |
| **Orders** | `POST` | `/orders/:id/cancel`| Authenticated | Cancel eligible order & atomically restore stock |
| **Inventory**| `GET` | `/inventory/low-stock`| Seller, Admin| Products with stock $\le$ threshold |
| **Inventory**| `GET` | `/inventory/summary` | Seller, Admin| High-level stock units, out-of-stock & valuation |
| **Reports** | `GET` | `/reports/sales-summary`| Seller, Admin| Sales grouped by day or month with AOV |
| **Reports** | `GET` | `/reports/best-sellers` | Seller, Admin| Top selling products by quantity and revenue |
| **Reports** | `GET` | `/reports/inventory-summary`| Seller, Admin| Inventory metrics grouped by category |
| **Reports** | `GET` | `/reports/category-sales`| Seller, Admin| Revenue per product category |

---

## Postman Collection & Testing

A complete Postman collection and environment are provided in the `/postman` folder:
- `postman/ecommerce.postman_collection.json`
- `postman/ecommerce.postman_environment.json`

### Importing into Postman:
1. Open Postman, click **Import**, and select both files from the `postman/` directory.
2. Select the **E-Commerce Capstone Environment**.
3. Run the **Login Admin**, **Login Seller**, or **Login Customer** requests. Test scripts will automatically save `accessToken`, `sellerAccessToken`, `adminAccessToken`, and `refreshToken` into your active environment variables.
4. Execute individual requests to test CRUD, positive checkouts, role denials (HTTP 403), validation errors (HTTP 400), and invalid lifecycle transitions (HTTP 409).

---

## Simulated Payment Disclaimer

> [!NOTE]
> All payment processing in this application is **SIMULATED**.
> Orders set `payment.method = "SIMULATED"` and generate a mock transaction ID (`TXN-SIM-XXXXXXXX`).
> **No actual financial transactions or payment gateway integrations are performed.**
> No credit card numbers, CVVs, or bank account details are ever requested, processed, or stored.
