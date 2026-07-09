const express = require('express');

const app = express();
const PORT = 5000;

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
