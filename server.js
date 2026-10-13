const dotenv = require('dotenv');
// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

const server = app.listen(PORT, () => {
  console.log(`[Server] Danza SON ERP Backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection] ${err.message}`);
});
