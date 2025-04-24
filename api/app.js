const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// ייבוא קובץ הקונפיגורציה המרכזי
const config = require('../config');

// אתחול מסדי נתונים
const { initializeDatabase } = require('../core/db/postgres-db');
const { initializeClickhouse } = require('../core/db/clickhouse-db');

// ייבוא middleware וראוטרים
const authMiddleware = require('./middlewares/auth');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const eventRoutes = require('./routes/events');
const dashboardRoutes = require('./routes/dashboards');

// בדיקה: האם כל ראוטר ומידלוור נטענו כראוי
console.log('authRoutes:', typeof authRoutes);
console.log('projectRoutes:', typeof projectRoutes);
console.log('eventRoutes:', typeof eventRoutes);
console.log('dashboardRoutes:', typeof dashboardRoutes);
console.log('authMiddleware:', typeof authMiddleware);

// יצירת אפליקציית Express
const app = express();
const PORT = config.server.port || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(cors({
  origin: config.cors.origin || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, '../ui/public')));

// ✅ Logging לפני כל app.use כדי לאתר באגים
console.log("Registering route: /api/auth", typeof authRoutes);
app.use('/api/auth', authRoutes);

console.log("Registering route: /api/projects", typeof authMiddleware, typeof projectRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);

console.log("Registering route: /api/events", typeof authMiddleware, typeof eventRoutes);
app.use('/api/events', authMiddleware, eventRoutes);

console.log("Registering route: /api/dashboards", typeof authMiddleware, typeof dashboardRoutes);
app.use('/api/dashboards', authMiddleware, dashboardRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Public routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/views/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/views/login.html'));
});

app.get('/verify/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/views/verify.html'));
});

app.get('/reset-password/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/views/reset-password.html'));
});

// Protected route
app.get('/dashboard', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/views/analytics-dashboard.html'));
});

// Additional UI page: Analytics Engine overview
app.get('/analytics-engine', (req, res) => {
  res.sendFile(path.join(__dirname, '../ui/views/analytics-engine.html'));
});

// Catch-all: כל נתיב שלא תאם למעלה יחזיר index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../ui/views/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: config.server.env === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    await initializeClickhouse();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start server
if (require.main === module) {
  startServer();
}

module.exports = app;
