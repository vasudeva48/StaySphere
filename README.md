# 🏠 StaySphere – Hostel & PG Management System

StaySphere is a full-stack Hostel & PG Management System designed to simplify hostel and PG administration. It provides separate Admin and Tenant portals to efficiently manage rooms, tenants, rent, agreements, maintenance requests, visitors, attendance, expenses, and notices from a single platform.

---

## 🌐 Live Demo

**Frontend:**  
https://staysphere-app.netlify.app/

**Backend API:**  
https://staysphere-backend-cdg7.onrender.com

---

## ✨ Features

### 👨‍💼 Admin Portal

- Secure Admin Authentication
- Dashboard with Statistics
- Room & Bed Management
- Tenant Management
- Rent Management
- Digital Agreement Management
- Maintenance Request Management
- Visitor Management
- Attendance Management
- Expense Tracking
- Notice Board Management
- Search & Filter Support
- Responsive Dashboard

### 👤 Tenant Portal

- Secure Tenant Authentication
- Personal Dashboard
- View Room & Bed Details
- View Rent Records
- View Digital Agreement
- Submit Maintenance Requests
- Track Maintenance Status
- View Notices
- Profile Management

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
- JSON Web Token (JWT)
- Role-Based Access Control

### Deployment
- Frontend: Netlify
- Backend: Render

---

## 📂 Project Structure

```
StaySphere/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── config/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   └── ...
│
└── README.md
```

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/vasudeva48/StaySphere.git
```

### Navigate to Project

```bash
cd StaySphere
```

### Install Backend Dependencies

```bash
cd backend
npm install
```

### Configure Environment Variables

Create a `.env` file inside the backend folder.

```env
PORT=5000
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_SECRET_KEY
```

### Start Backend

```bash
npm start
```

### Open Frontend

Open the `frontend/index.html` file in your browser or serve it using a local web server.

---

## 📸 Modules

- Authentication
- Dashboard
- Room Management
- Tenant Management
- Rent Management
- Digital Agreements
- Maintenance Requests
- Visitor Management
- Attendance
- Expense Tracking
- Notice Board

---

## 🔒 Security

- JWT Authentication
- Password Hashing
- Protected Routes
- Role-Based Authorization
- Secure API Access

---

## 👨‍💻 Author

**Vasudeva**

GitHub: https://github.com/vasudeva48

---

## 📄 License

This project is developed for educational and portfolio purposes.

© 2026 StaySphere. All rights reserved.
