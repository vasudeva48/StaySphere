# 🏨 StaySphere – PG & Hostel Management Platform

StaySphere is a full-stack PG & Hostel Management System that helps hostel owners efficiently manage tenants, rooms, rent, agreements, maintenance requests, visitors, expenses, attendance, and notices through dedicated Admin and Tenant portals.

---

## 🚀 Features

### 🔐 Authentication
- JWT Authentication
- Secure Login & Registration
- Role-Based Access Control (Admin & Tenant)

### 👨‍💼 Admin Portal
- Dashboard with Live Statistics
- Tenant Management
- Room & Bed Management
- Rent Management
- Digital Agreements
- Maintenance Requests
- Visitor Management
- Expense Tracking
- Attendance & Check-In
- Notice Board

### 👤 Tenant Portal
- Personal Dashboard
- View Assigned Room & Bed
- Rent History
- View Digital Agreement
- Submit & Track Maintenance Requests
- View Active Notices

---

## 📋 Modules

- 👥 Tenant Management
- 🛏️ Room & Bed Management
- 💰 Rent Management
- 📄 Digital Agreements
- 🔧 Maintenance Requests
- 🚶 Visitor Management
- 💸 Expense Tracking
- 📍 Attendance & Check-In
- 📢 Notice Board

---

## ✨ Key Highlights

- Separate Admin & Tenant Dashboards
- Manual Room Numbering with Unique Validation
- Automatic Room & Bed Synchronization
- Role-Based Authentication & Authorization
- Live Dashboard Statistics
- Search & Filtering
- Responsive Dark Glass UI
- MongoDB Data Persistence
- RESTful API Architecture

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)

### Backend
- Node.js
- Express.js

### Database
- MongoDB Atlas
- Mongoose

### Authentication
- JWT
- bcrypt.js

---

## 📂 Project Structure

```
StaySphere/
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── dashboard.html
│   ├── tenant-dashboard.html
│   ├── tenants.html
│   ├── rooms.html
│   ├── rent.html
│   ├── agreements.html
│   ├── maintenance.html
│   ├── visitors.html
│   ├── expenses.html
│   ├── attendance.html
│   ├── notices.html
│   └── tenant-notices.html
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── config/
│   └── server.js
│
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/vasudeva48/StaySphere.git
```

### Backend

```bash
cd StaySphere/backend
npm install
npm run dev
```

Backend runs at:

```
const API_BASE = 'https://staysphere-backend-1lyo.onrender.com/api';
```

### Frontend

Open the `frontend` folder using Live Server or any static server.

---

## 🔒 User Roles

### Admin
- Manage Tenants
- Manage Rooms & Beds
- Manage Rent
- Manage Agreements
- Manage Maintenance
- Manage Visitors
- Manage Expenses
- Manage Attendance
- Manage Notices
- View Dashboard Analytics

### Tenant
- View Room & Bed Details
- View Rent History
- View Agreement
- Submit Maintenance Requests
- View Notices

---

## 📌 Future Enhancements

- Online Payment Gateway
- Email Notifications
- File Upload Support
- Reports & Analytics
- Mobile Responsive Improvements

---

## 👨‍💻 Author

**Vasudeva**

B.Tech CSE (AI & ML)

---

⭐ If you like this project, consider giving it a Star on GitHub!
