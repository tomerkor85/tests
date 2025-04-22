const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'radixinsight',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
};

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
};

// Create database connections
const pgPool = new Pool(dbConfig);
const redisClient = new Redis(redisConfig);

// Initialize database
async function initializeDatabase() {
  try {
    // Check if database exists
    const client = await pgPool.connect();
    
    try {
      // Check if users table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('Database schema not found. Creating schema...');
        
        // Read schema SQL file
        const schemaPath = path.join(__dirname, 'database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema creation
        await client.query(schemaSql);
        console.log('Database schema created successfully.');
      } else {
        console.log('Database schema already exists.');
      }
    } finally {
      client.release();
    }
    
    console.log('Database initialized successfully.');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
async function startServer() {
  // Initialize database
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    console.error('Failed to initialize database. Exiting...');
    process.exit(1);
  }
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  // Close database connections
  await pgPool.end();
  await redisClient.quit();
  
  process.exit(0);
});

// Start server
startServer();

module.exports = app;
