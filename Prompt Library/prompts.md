# 🏠 StaySphere Development Prompt Library

This prompt library documents the major development prompts used during the building of the **StaySphere – PG & Hostel Management Platform** project. StaySphere is a comprehensive, full-stack management system tailored for hostel and PG owners (Admins) and residents (Tenants). It features a Node.js/Express.js backend, MongoDB Atlas database integration, JWT-based role-based access control, and a responsive frontend built on HTML5, CSS3, and Vanilla JavaScript.

The development of the platform was executed in a structured, modular manner across several development phases.

---

## 📂 Table of Contents
- [Phase 1: Project Setup & Database Scaffolding](#phase-1-project-setup--database-scaffolding)
- [Phase 2: Authentication, JWT & MVC Core Architecture](#phase-2-authentication-jwt--mvc-core-architecture)
- [Phase 3: Database Models & Backend REST APIs](#phase-3-database-models--backend-rest-apis)
- [Phase 4: Client-Side User Interface & API Integration](#phase-4-client-side-user-interface--api-integration)
- [Phase 5: Refinements, Session Management & Production Deployment](#phase-5-refinement-session-management--production-deployment)

---

## 🛠️ Phase 1: Project Setup & Database Scaffolding

### 1. Initial Directory Setup
* **Goal**: Establish the repository framework separating the client-side files from server-side configurations.
* **Commit**: `Initialize StaySphere project structure`
* **Prompt**:
  > Set up a Node.js project directory structure named "StaySphere" to build a full-stack hostel/PG management app.
  > - Create a `backend/` folder containing directories for: `config/`, `controllers/`, `middleware/`, `models/`, and `routes/`.
  > - Add a `frontend/` folder containing directories for `css/` and `js/`, alongside root frontend HTML pages.
  > - Initialize `package.json` inside the backend directory with necessary dependencies: `express`, `mongoose`, `dotenv`, `cors`, `jsonwebtoken`, and `bcryptjs`.
  > - Create a basic entry `server.js` file inside `backend/` that sets up Express, uses CORS and JSON parser middleware, and loads local environment variables via `dotenv`.

### 2. MongoDB Atlas Connection
* **Goal**: Integrate Mongoose for database connectivity with fallback and success logs.
* **Commit**: `Connect MongoDB Atlas`
* **Prompt**:
  > Write a Mongoose configuration module in `backend/config/db.js` that establishes a connection with MongoDB Atlas.
  > - Retrieve the connection string from `process.env.MONGO_URI`.
  > - Implement robust error handling to log connections and capture failures gracefully (using try-catch blocks and logging clear success messages).
  > - Export the database connection helper function and integrate it within `backend/server.js` so the database connects immediately when the server starts.

---

## 🔐 Phase 2: Authentication, JWT & MVC Core Architecture

### 3. Backend MVC Organization
* **Goal**: Create a controller and routing system layout following MVC principles.
* **Commit**: `Organize backend using MVC architecture`
* **Prompt**:
  > Scaffold backend routes and controllers adhering to MVC architecture patterns.
  > - Create a master router file `backend/routes/index.js` which routes traffic to resource-specific sub-routes (auth, rooms, tenants, maintenance, etc.).
  > - Build a reusable response helper inside a utility directory or within base controllers so that all API endpoints output JSON in the following consistent format:
  >   ```json
  >   {
  >     "success": true,
  >     "message": "User-friendly message descriptive of the operation",
  >     "data": {}
  >   }
  >   ```

### 4. Database User Schema Design
* **Goal**: Create a Mongoose user model with built-in security features.
* **Commit**: `Create user model`
* **Prompt**:
  > Create the User model schema in `backend/models/User.js` using Mongoose.
  > - The schema must include fields for: `fullName` (String, required), `email` (String, required, unique, validated), `password` (String, required), `phone` (String), and `role` (String, enum: `['Admin', 'Tenant']`, default `'Tenant'`).
  > - Add pre-save middleware to hash password strings using `bcryptjs` automatically before they are inserted/updated in MongoDB.
  > - Add an instance method `comparePassword` to the schema to easily compare client login inputs with stored hashes.

### 5. JWT Authentication & Role Gate Implementation
* **Goal**: Set up registration, login, profile query, and middleware to enforce authentication and roles.
* **Commit**: `Implement user registration API` & `Implement JWT authentication`
* **Prompt**:
  > Implement registration, login, and authorization validation in the backend:
  > 1. Create `backend/controllers/authController.js` and `backend/routes/authRoutes.js`.
  > 2. The registration API should validate inputs, check if the email exists, hash the user's password, save the database document, and return a signed JSON Web Token (JWT).
  > 3. The login API must verify the email, match the password hash, and return a JWT signed with the user's ID and role.
  > 4. Create an authentication middleware inside `backend/middleware/authMiddleware.js` that checks for token existence in `Authorization` headers, verifies the token, and attaches the payload data to `req.user`. Also implement helper roles verification (e.g. `authorizeRoles('Admin')`).
  > 5. Create a `/auth/me` endpoint to fetch user profile parameters using the validated token payload.

---

## 💼 Phase 3: Database Models & Backend REST APIs

### 6. Room, Bed, & Tenant Allocation Schema & Controllers
* **Goal**: Create database models tracking occupancy status, dynamically updating rooms on allocation.
* **Commit**: `Implement tenant management` & `Implement room and bed management`
* **Prompt**:
  > Create schemas and CRUD endpoints for rooms and tenants to manage capacity allocations:
  > 1. Room Schema (`backend/models/Room.js`):
  >    - Fields: `roomNumber` (unique), `roomType` (enum: single, double, triple, four-bed), `totalBeds`, `occupiedBeds` (default 0), `rentPerBed`, and `status` (enum: 'Available', 'Full').
  > 2. Tenant Schema (`backend/models/Tenant.js`):
  >    - Fields: `userId` (ref User), `fullName`, `email`, `phone`, `roomNumber`, `bedNumber`, `checkInDate`, and `status` (enum: 'Active', 'In-Active').
  > 3. Allocation logic: Write controller logic such that when a tenant is registered and assigned a room, the API increments `occupiedBeds` inside the respective Room model. If the room hits capacity, set `status` to 'Full'. Reverse this count when a tenant is deactivated or checked out.

### 7. Rent Records & Digital Rental Agreements Backend
* **Goal**: Enable generating rental billing and contract signing schemas.
* **Commit**: `Implement rent management` & `Implement digital agreements`
* **Prompt**:
  > Develop schemas, controllers, and routing rules for Rent logs and Digital Contracts:
  > 1. Rent Schema (`backend/models/Rent.js`):
  >    - Fields: `tenantId` (ref Tenant), `amountDue`, `dueDate`, `paymentDate`, `billingMonth`, and `status` (enum: 'Paid', 'Pending', 'Overdue').
  > 2. Agreement Schema (`backend/models/Agreement.js`):
  >    - Fields: `tenantId` (ref Tenant), `agreementText`, `rentAmount`, `depositAmount`, `startDate`, `endDate`, `signedAt`, and `status` (enum: 'Pending', 'Signed').
  > 3. Develop API routes enabling Admins to create rent records, update billing status, and publish agreement frameworks. Allow Tenants to fetch their due invoices, view agreements, and sign contracts.

### 8. Maintenance Logs & Visitor Records Backend
* **Goal**: Maintain records of facility maintenance and visitor logs.
* **Commit**: `Implement maintenance requests` & `Implement visitor management module`
* **Prompt**:
  > Implement database schemas and routes for Visitor logging and Maintenance tracking:
  > 1. MaintenanceRequest (`backend/models/MaintenanceRequest.js`):
  >    - Fields: `tenantId` (ref User), `category` (enum: Plumbing, Electrical, Cleaning, Furniture, Other), `description`, `priority` (Low, Medium, High), and `status` (Pending, In-Progress, Resolved).
  > 2. Visitor (`backend/models/Visitor.js`):
  >    - Fields: `tenantId` (ref Tenant), `visitorName`, `relation`, `contactNumber`, `checkInTime`, `checkOutTime`, and `purpose`.
  > 3. Provide REST routes allowing tenants to submit maintenance issues and track status. Admins must have permissions to view all reported issues, update statuses, and log visitor lists.

### 9. Attendance, Expense Tracking & Announcement Board Backend
* **Goal**: Create helpers to log daily attendance, track operating costs, and publish notice announcements.
* **Commit**: `Implement attendance and check-in module`, `Implement expense tracking module`, and `Implement notice board module`
* **Prompt**:
  > Build schema representations and CRUD capabilities for Attendance, Expenses, and Notices:
  > 1. Attendance Model (`backend/models/Attendance.js`): tracks date, tenantId reference, and state (Present, Absent, Late).
  > 2. Expense Model (`backend/models/Expense.js`): tracks category (Utility, Maintenance, Salaries, Food, Other), amount, description, and recordedBy user.
  > 3. Notice Model (`backend/models/Notice.js`): tracks notice title, content, targetAudience (All, Admins, Tenants), and date.
  > 4. Connect routing channels so admins can save daily logs, track business expenses, and post announcements. Tenants must be able to retrieve public notices on their dashboards.

---

## 💻 Phase 4: Client-Side User Interface & API Integration

### 10. Authentication Frontend & Routing Locks
* **Goal**: Construct login forms and secure client-side navigation.
* **Commit**: `Implement authentication frontend` & `Fix authentication redirect issue`
* **Prompt**:
  > Build client-side HTML, CSS, and JS components to support credentials verification:
  > - Create `login.html` and `register.html` pages containing standard input forms.
  > - Write JavaScript handlers to post form data to backend endpoints `/api/auth/register` and `/api/auth/login`. On success, store the JWT (`ss_token`) and user object (`ss_user`) in browser `localStorage`.
  > - Setup client-side page load checks: if no token exists, redirect the user back to `login.html`. Ensure users cannot bypass dashboard validation.
  > - Use vanilla CSS to style these pages, creating a clean, modern aesthetic with smooth animations, clear form fields, and error status display boxes.

### 11. Admin Panel & Room/Tenant Management UI
* **Goal**: Create HTML tables and dynamic modals to manage room allocations and tenants.
* **Commit**: `Implement owner dashboard`, `Implement room and bed management`, and `Implement tenant management`
* **Prompt**:
  > Design UI components and client-side JavaScript for Admin pages:
  > 1. Create `dashboard.html` representing the main workspace. Add statistic metric cards summarizing: total active tenants, registered rooms, vacant beds, and pending maintenance requests.
  > 2. Build `rooms.html` with tables displaying all rooms, occupied beds, and their status. Integrate an overlay modal with a form to create new rooms.
  > 3. Build `tenants.html` displaying current residents. Integrate checkout and deactivation actions. Ensure the roommate allocation dropdown is loaded dynamically with rooms marked 'Available' from the API.
  > Write JavaScript fetch scripts with appropriate HTTP headers (including JWT tokens) to populate these fields.

### 12. Transactional Management Panels (Rent, Agreements, Maintenance)
* **Goal**: Render active contracts, issue billing invoices, and display maintenance status pipelines.
* **Commit**: `Implement rent management`, `Implement digital agreements`, & `Implement maintenance requests` UI
* **Prompt**:
  > Build frontend interfaces and fetch handlers for Admin and Tenant transactional modules:
  > 1. Rent: Create tables to list invoice items. Provide admins with options to mark invoices 'Paid' and tenants with a simple receipt viewing layout.
  > 2. Digital Agreements: Build a template view that renders legal agreements dynamically. Provide a "Sign Agreement" button on the tenant side which updates the record's status in MongoDB.
  > 3. Maintenance requests: Design forms for tenants to submit repair requests with description and priority selectors. Design an admin dashboard view displaying tasks categorized by status (Pending, In-Progress, Resolved) with toggle buttons to advance statuses.

### 13. Operations Frontends (Visitor Logs, Attendance grids, Expenses, Notice Boards)
* **Goal**: Provide administrative controls for managing daily logs, notices, and finance tracking.
* **Commit**: `Implement visitor management module`, `Implement expense tracking module`, `Implement attendance and check-in module`, & `Implement notice board module` UI
* **Prompt**:
  > Create operational web forms and tracking views:
  > - `attendance.html`: A daily calendar check sheet displaying active tenant cards with check-circles to select 'Present', 'Absent', or 'Late', submitting lists in a batch request.
  > - `visitors.html`: A log management console to enter guest names, check-in timestamps, and host information.
  > - `expenses.html`: Form to record daily operational expenditures and a listing table showing total monthly expenses grouped by categories.
  > - `notices.html` / `tenant-notices.html`: Admin notice creator form and a responsive, card-based notice board view for tenants to read active updates.

---

## 🚀 Phase 5: Refinements, Session Management & Production Deployment

### 14. Global API Adaptability for Deployment
* **Goal**: Centralize frontend API paths to allow smooth switching between environments.
* **Commit**: `Replace localhost API URLs with production backend` & `Update frontend API URLs for production deployment`
* **Prompt**:
  > Standardize all client-side JavaScript source files to avoid hardcoded dev domains.
  > - Create a global constant `API_BASE` inside a shared JS asset (e.g. `frontend/js/app.js`) referencing the production Render backend domain:
  >   `const API_BASE = 'https://staysphere-backend-cdg7.onrender.com/api';`
  > - Refactor all fetch calls across frontend JS files to append endpoints to this base URL variable.

### 15. User Authentication State Mapping & Landing Page Polish
* **Goal**: Improve landing page responsiveness, about pages, and redirect loops.
* **Commit**: `Update landing page and add About page` & `Improve authentication and application stability`
* **Prompt**:
  > Revise homepage and session components:
  > - Implement an Immediately Invoked Function Expression (IIFE) inside the landing page controller script to verify user session states. If a valid token is found, fetch `/auth/me`. If successful, change navigation elements (swap 'Login'/'Sign Up' for a role-specific dashboard link and 'Logout' button).
  > - Design an `about.html` page using the project's styling guidelines.
  > - Polish layout designs, typography (importing modern Sans-Serif fonts), border borders, color contrasts, and verify full responsiveness on mobile screens.
