require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const ticketRoutes = require('./routes/tickets');

const app = express();

app.use(logger);                                        // 1. log every request
app.use(express.json());                                // 2. parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // 3. serve the frontend
app.use('/api/tickets', ticketRoutes);                  // 4. API routes
app.use(errorHandler);                                  // 5. must be last

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
