const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const agentsRouter = require('./routes/agents');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/agents', agentsRouter);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Agent Flow Builder API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 