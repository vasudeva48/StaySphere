require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');

// ── Route imports ──────────────────────────────────────────
const indexRoutes     = require('./routes/index');
const authRoutes      = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const tenantRoutes    = require('./routes/tenantRoutes');
const roomRoutes      = require('./routes/roomRoutes');
const rentRoutes      = require('./routes/rentRoutes');
const agreementRoutes = require('./routes/agreementRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const visitorRoutes     = require('./routes/visitorRoutes');
const expenseRoutes     = require('./routes/expenseRoutes');
const attendanceRoutes  = require('./routes/attendanceRoutes');
const noticeRoutes      = require('./routes/noticeRoutes');


const app  = express();
const PORT = process.env.PORT || 5000;

// ── Database ───────────────────────────────────────────────
connectDB();

// ── Middleware ─────────────────────────────────────────────
const path = require('path');

// Allow requests from the local dev server and the deployed Vercel frontend
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5500',  // VS Code Live Server
  'http://127.0.0.1:3000',
];
// If FRONTEND_URL is set (e.g. https://staysphere.vercel.app), add it too
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes ─────────────────────────────────────────────────
app.use('/',              indexRoutes);
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tenants',   tenantRoutes);
app.use('/api/rooms',     roomRoutes);
app.use('/api/rent',      rentRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/visitors',   visitorRoutes);
app.use('/api/expenses',   expenseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notices',    noticeRoutes);

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`StaySphere server is running on http://localhost:${PORT}`);
});
