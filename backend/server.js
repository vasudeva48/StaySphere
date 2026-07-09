require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');

// ── Route imports ──────────────────────────────────────────
const indexRoutes     = require('./routes/index');
const authRoutes      = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

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

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`StaySphere server is running on http://localhost:${PORT}`);
});
