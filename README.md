# StaySphere – PG & Hostel Management Platform

StaySphere is a full-stack PG & Hostel Management Platform built using the MERN stack. It helps hostel owners efficiently manage tenants, rooms, rent collection, agreements, and maintenance requests through a centralized dashboard. The platform is designed to simplify hostel administration with secure authentication and an easy-to-use interface.

---

## Features Completed

- User Registration & Login
- JWT-based Authentication
- Role-based Authorization (Admin & Tenant)
- Owner Dashboard
- Tenant Management
- Room & Bed Management
- Online Rent Collection
- Digital Agreements
- Maintenance Requests

---

## Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- MongoDB Atlas
- Mongoose

### Authentication
- JSON Web Token (JWT)
- bcrypt

---

## Project Structure

```text
StaySphere/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── tenants.html
│   ├── rooms.html
│   ├── rent.html
│   ├── agreements.html
│   ├── maintenance.html
│   ├── css/
│   └── js/
│
└── backend/
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── server.js
    ├── package.json
    ├── .env.example
    └── .gitignore
```

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/StaySphere.git
cd StaySphere
```

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend server will run at:

```
http://localhost:5000
```

### Frontend Setup

Open the `frontend` folder using **Live Server** in VS Code or any static web server.

---

## Authentication

- User Registration
- User Login
- Secure JWT Authentication
- Role-based Access Control

---

## Modules Implemented

### Owner Dashboard
- Live statistics
- Dashboard summary
- Dynamic data display

### Tenant Management
- Add Tenant
- Edit Tenant
- Delete Tenant
- Search & Filter

### Room & Bed Management
- Create Rooms
- Manage Beds
- Assign/Unassign Tenants
- Track Occupancy

### Online Rent Collection
- Create Rent Records
- Payment History
- Pending / Paid / Overdue Status
- Dashboard Integration

### Digital Agreements
- Create Agreements
- Edit Agreements
- Search & Filter
- Active / Expired Status

### Maintenance Requests
- Raise Maintenance Requests
- Track Request Status
- Admin Resolution
- Dashboard Statistics

---

## Upcoming Features

- Visitor Management
- Expense Tracking
- Attendance & Check-In
- Notice Board

---

## Future Enhancements

- Tenant Dashboard
- Email Notifications
- Online Payment Gateway
- Reports & Analytics
- Mobile Responsive Improvements

---

## Author

**Vasu Dev**

B.Tech – Computer Science & Engineering (AI & ML)

---

## License

This project is developed for educational and academic purposes.