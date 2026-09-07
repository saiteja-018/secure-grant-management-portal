require('dotenv').config();
const app = require('./app');
const db = require('./config/db');
const { seedDatabase } = require('./config/seed');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('Connecting to PostgreSQL and initializing schema...');
    await db.initializeDatabase();

    console.log('Running database seed verification...');
    await seedDatabase();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Secure Grant Management Portal is running!`);
      console.log(` Server URL: http://localhost:${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/health`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      server.close(async () => {
        try {
          await db.pool.end();
          console.log('Database connection pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('Error during database shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
