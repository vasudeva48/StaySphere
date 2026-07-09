require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

// ── Route imports ──────────────────────────────────────────
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Database ───────────────────────────────────────────────
connectDB();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────
app.use('/', indexRoutes);

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`StaySphere server is running on http://localhost:${PORT}`);
});
