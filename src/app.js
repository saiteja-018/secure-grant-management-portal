const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const cacheService = require('./config/redis');
const db = require('./config/db');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static UI files
app.use(express.static(path.join(__dirname, '../public')));

// Service Health Check Endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'down';
  let redisStatus = 'down';

  try {
    await db.query('SELECT 1');
    dbStatus = 'up';
  } catch (err) {
    dbStatus = 'down';
  }

  try {
    await cacheService.ping();
    redisStatus = 'up';
  } catch (err) {
    redisStatus = 'down';
  }

  const isHealthy = dbStatus === 'up';
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      cache: redisStatus
    }
  });
});

// API Routes
app.use('/api', apiRoutes);

// Fallback for API 404s
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.baseUrl}` });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
