require('dotenv').config();

// קונפיגורציה מרכזית לפרויקט
const config = {
  // הגדרות שרת
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  
  // הגדרות מסד נתונים PostgreSQL
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'radixinsight',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  
  // הגדרות ClickHouse
  clickhouse: {
    url: process.env.CLICKHOUSE_URL || 'http://localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT, 10) || 8123,
    database: process.env.CLICKHOUSE_DB || 'radixinsight',
    user: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
  },
  
  // הגדרות Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  
  // הגדרות JWT לאימות
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  // הגדרות שרת דואר אלקטרוני
  email: {
    host: process.env.EMAIL_HOST || 'smtp.outlook.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'RadixInsight <no-reply@example.com>',
  },
  
  // הגדרות CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  // כתובת ה-URL של הממשק הקדמי
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
};

module.exports = config;
