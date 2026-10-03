const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000; 

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Sample API Route
app.get('/api/data', (req, res) => {
  res.json({ message: "Hello from the backend server!" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});