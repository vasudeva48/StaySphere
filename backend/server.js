require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.send('StaySphere Backend Running');
});

// Start server
app.listen(PORT, () => {
  console.log(`StaySphere server is running on http://localhost:${PORT}`);
});
