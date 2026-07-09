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


const app  = express();
const PORT = process.env.PORT || 5000;

// ── Database ───────────────────────────────────────────────
connectDB();

// ── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`StaySphere server is running on http://localhost:${PORT}`);
});
