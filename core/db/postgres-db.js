const { Pool } = require('pg');
const Redis = require('ioredis');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const pgConfig = {
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

// Create PostgreSQL connection pool
const pgPool = new Pool(pgConfig);

// Create Redis client
const redisClient = new Redis(redisConfig);

// Database initialization function
async function initializeDatabase() {
  const client = await pgPool.connect();
  try {
    console.log('Checking database schema...');
    
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
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute schema creation
      await client.query(schemaSql);
      console.log('Database schema created successfully.');
      
      // Create admin user with hashed password
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@radix-int.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      
      // Update the placeholder hash with the actual hash
      await client.query(`
        UPDATE users 
        SET password_hash = $1 
        WHERE email = $2
      `, [passwordHash, adminEmail]);
      
      console.log('Admin user created successfully.');
    } else {
      console.log('Database schema already exists.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// User-related database functions
const userDb = {
  // Create a new user
  async createUser(userData) {
    const { email, password, firstName, lastName, role = 'user' } = userData;
    
    // Validate email domain
    if (!email.endsWith('@radix-int.com')) {
      throw new Error('Email must be from the radix-int.com domain');
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate verification token
    const verificationToken = uuidv4();
    
    const client = await pgPool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Insert user
      const result = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, 
          role, verification_token
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, role, created_at
      `, [email, passwordHash, firstName, lastName, role, verificationToken]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return {
        user: result.rows[0],
        verificationToken
      };
    } catch (err) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Verify user email
  async verifyEmail(token) {
    const client = await pgPool.connect();
    try {
      const result = await client.query(`
        UPDATE users
        SET email_verified = true, verification_token = NULL
        WHERE verification_token = $1
        RETURNING id, email, first_name, last_name, role
      `, [token]);
      
      if (result.rowCount === 0) {
        throw new Error('Invalid verification token');
      }
      
      return result.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Authenticate user
  async authenticateUser(email, password) {
    const client = await pgPool.connect();
    try {
      // Get user by email
      const result = await client.query(`
        SELECT id, email, password_hash, first_name, last_name, 
               role, is_active, email_verified
        FROM users
        WHERE email = $1
      `, [email]);
      
      if (result.rowCount === 0) {
        throw new Error('Invalid email or password');
      }
      
      const user = result.rows[0];
      
      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is disabled');
      }
      
      // Check if email is verified
      if (!user.email_verified) {
        throw new Error('Email not verified');
      }
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        throw new Error('Invalid email or password');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          role: user.role
        },
        process.env.JWT_SECRET || 'radixinsight-secret-key',
        { expiresIn: '24h' }
      );
      
      // Store session in Redis
      const sessionId = uuidv4();
      await redisClient.set(
        `session:${sessionId}`,
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role
        }),
        'EX',
        86400 // 24 hours
      );
      
      // Create session record
      await client.query(`
        INSERT INTO user_sessions (
          user_id, token, ip_address, user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')
      `, [user.id, sessionId, null, null]);
      
      return {
        token,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      };
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Get user by ID
  async getUserById(userId) {
    const client = await pgPool.connect();
    try {
      const result = await client.query(`
        SELECT id, email, first_name, last_name, role, 
               is_active, email_verified, created_at, updated_at
        FROM users
        WHERE id = $1
      `, [userId]);
      
      if (result.rowCount === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Update user
  async updateUser(userId, userData) {
    const { firstName, lastName, role } = userData;
    
    const client = await pgPool.connect();
    try {
      const result = await client.query(`
        UPDATE users
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            role = COALESCE($3, role)
        WHERE id = $4
        RETURNING id, email, first_name, last_name, role, is_active, email_verified
      `, [firstName, lastName, role, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    const client = await pgPool.connect();
    try {
      // Get current password hash
      const userResult = await client.query(`
        SELECT password_hash
        FROM users
        WHERE id = $1
      `, [userId]);
      
      if (userResult.rowCount === 0) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const passwordMatch = await bcrypt.compare(
        currentPassword, 
        userResult.rows[0].password_hash
      );
      
      if (!passwordMatch) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await client.query(`
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
      `, [newPasswordHash, userId]);
      
      return true;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }
};

// Project-related database functions
const projectDb = {
  // Create a new project
  async createProject(projectData, userId) {
    const { name, description } = projectData;
    
    // Generate API key
    const apiKey = uuidv4().replace(/-/g, '');
    
    const client = await pgPool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Insert project
      const result = await client.query(`
        INSERT INTO projects (
          name, description, api_key, created_by
        ) VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, api_key, created_by, created_at
      `, [name, description, apiKey, userId]);
      
      // Add creator as project member with admin role
      await client.query(`
        INSERT INTO project_members (
          project_id, user_id, role
        ) VALUES ($1, $2, 'admin')
      `, [result.rows[0].id, userId]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (err) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Get project by ID
  async getProjectById(projectId, userId) {
    const client = await pgPool.connect();
    try {
      // Check if user has access to project
      const memberCheck = await client.query(`
        SELECT role
        FROM project_members
        WHERE project_id = $1 AND user_id = $2
      `, [projectId, userId]);
      
      if (memberCheck.rowCount === 0) {
        throw new Error('Access denied');
      }
      
      // Get project details
      const result = await client.query(`
        SELECT p.id, p.name, p.description, p.api_key, 
               p.created_by, p.created_at, p.updated_at,
               u.email as creator_email,
               u.first_name as creator_first_name,
               u.last_name as creator_last_name
        FROM projects p
        JOIN users u ON p.created_by = u.id
        WHERE p.id = $1
      `, [projectId]);
      
      if (result.rowCount === 0) {
        throw new Error('Project not found');
      }
      
      // Get project members
      const membersResult = await client.query(`
        SELECT pm.user_id, pm.role, u.email, u.first_name, u.last_name
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1
      `, [projectId]);
      
      // Get event types
      const eventTypesResult = await client.query(`
        SELECT id, name, description, is_active, created_at
        FROM event_types
        WHERE project_id = $1
      `, [projectId]);
      
      // Combine results
      const project = result.rows[0];
      project.members = membersResult.rows;
      project.eventTypes = eventTypesResult.rows;
      
      return project;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Get all projects for a user
  async getUserProjects(userId) {
    const client = await pgPool.connect();
    try {
      const result = await client.query(`
        SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
               pm.role as user_role
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = $1
        ORDER BY p.created_at DESC
      `, [userId]);
      
      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Add member to project
  async addProjectMember(projectId, email, role, currentUserId) {
    const client = await pgPool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Check if current user has admin access
      const adminCheck = await client.query(`
        SELECT role
        FROM project_members
        WHERE project_id = $1 AND user_id = $2
      `, [projectId, currentUserId]);
      
      if (adminCheck.rowCount === 0 || adminCheck.rows[0].role !== 'admin') {
        throw new Error('Only project admins can add members');
      }
      
      // Find user by email
      const userResult = await client.query(`
        SELECT id
        FROM users
        WHERE email = $1
      `, [email]);
      
      if (userResult.rowCount === 0) {
        throw new Error('User not found');
      }
      
      const userId = userResult.rows[0].id;
      
      // Check if user is already a member
      const memberCheck = await client.query(`
        SELECT role
        FROM project_members
        WHERE project_id = $1 AND user_id = $2
      `, [projectId, userId]);
      
      if (memberCheck.rowCount > 0) {
        // Update role if user is already a member
        await client.query(`
          UPDATE project_members
          SET role = $1
          WHERE project_id = $2 AND user_id = $3
        `, [role, projectId, userId]);
      } else {
        // Add new member
        await client.query(`
          INSERT INTO project_members (
            project_id, user_id, role
          ) VALUES ($1, $2, $3)
        `, [projectId, userId, role]);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      return {
        projectId,
        userId,
        role
      };
    } catch (err) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

// Event type related database functions
const eventTypeDb = {
  // Create a new event type
  async createEventType(projectId, eventTypeData, userId) {
    const { name, description } = eventTypeData;
    
    const client = await pgPool.connect();
    try {
      // Check if user has access to project
      const memberCheck = await client.query(`
        SELECT role
        FROM project_members
        WHERE project_id = $1 AND user_id = $2
      `, [projectId, userId]);
      
      if (memberCheck.rowCount === 0) {
        throw new Error('Access denied');
      }
      
      // Check if event type already exists
      const existingCheck = await client.query(`
        SELECT id
        FROM event_types
        WHERE project_id = $1 AND name = $2
      `, [projectId, name]);
      
      if (existingCheck.rowCount > 0) {
        throw new Error('Event type with this name already exists');
      }
      
      // Insert event type
      const result = await client.query(`
        INSERT INTO event_types (
          project_id, name, description
        ) VALUES ($1, $2, $3)
        RETURNING id, project_id, name, description, is_active, created_at
      `, [projectId, name, description]);
      
      return result.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Get event type by ID
  async getEventTypeById(eventTypeId, userId) {
    const client = await pgPool.connect();
    try {
      // Get event type with project access check
      const result = await client.query(`
        SELECT et.id, et.project_id, et.name, et.description, 
               et.is_active, et.created_at, et.updated_at
        FROM event_types et
        JOIN project_members pm ON et.project_id = pm.project_id
        WHERE et.id = $1 AND pm.user_id = $2
      `, [eventTypeId, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('Event type not found or access denied');
      }
      
      // Get event properties
      const propertiesResult = await client.query(`
        SELECT id, name, data_type, is_required, description, created_at
        FROM event_properties
        WHERE event_type_id = $1
        ORDER BY name
      `, [eventTypeId]);
      
      // Combine results
      const eventType = result.rows[0];
      eventType.properties = propertiesResult.rows;
      
      return eventType;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Add property to event type
  async addEventProperty(eventTypeId, propertyData, userId) {
    const { name, dataType, isRequired, description } = propertyData;
    
    const client = await pgPool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Check if user has access to event type's project
      const accessCheck = await client.query(`
        SELECT et.project_id
        FROM event_types et
        JOIN project_members pm ON et.project_id = pm.project_id
        WHERE et.id = $1 AND pm.user_id = $2
      `, [eventTypeId, userId]);
      
      if (accessCheck.rowCount === 0) {
        throw new Error('Access denied');
      }
      
      // Check if property already exists
      const existingCheck = await client.query(`
        SELECT id
        FROM event_properties
        WHERE event_type_id = $1 AND name = $2
      `, [eventTypeId, name]);
      
      if (existingCheck.rowCount > 0) {
        throw new Error('Property with this name already exists');
      }
      
      // Insert property
      const result = await client.query(`
        INSERT INTO event_properties (
          event_type_id, name, data_type, is_required, description
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id, event_type_id, name, data_type, is_required, description, created_at
      `, [eventTypeId, name, dataType, isRequired, description]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (err) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

// Dashboard related database functions
const dashboardDb = {
  // Create a new dashboard
  async createDashboard(projectId, dashboardData, userId) {
    const { name, description, layout, isPublic } = dashboardData;
    
    const client = await pgPool.connect();
    try {
      // Check if user has access to project
      const memberCheck = await client.query(`
        SELECT role
        FROM project_members
        WHERE project_id = $1 AND user_id = $2
      `, [projectId, userId]);
      
      if (memberCheck.rowCount === 0) {
        throw new Error('Access denied');
      }
      
      // Insert dashboard
      const result = await client.query(`
        INSERT INTO dashboards (
          project_id, name, description, layout, is_public, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, project_id, name, description, is_public, created_by, created_at
      `, [projectId, name, description, JSON.stringify(layout || {}), isPublic || false, userId]);
      
      return result.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Get dashboard by ID
  async getDashboardById(dashboardId, userId) {
    const client = await pgPool.connect();
    try {
      // Get dashboard with access check
      const result = await client.query(`
        SELECT d.id, d.project_id, d.name, d.description, 
               d.layout, d.is_public, d.created_by, 
               d.created_at, d.updated_at
        FROM dashboards d
        LEFT JOIN project_members pm ON d.project_id = pm.project_id AND pm.user_id = $2
        WHERE d.id = $1 AND (pm.user_id IS NOT NULL OR d.is_public = true)
      `, [dashboardId, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('Dashboard not found or access denied');
      }
      
      // Get dashboard widgets
      const widgetsResult = await client.query(`
        SELECT id, widget_type, title, query, position, settings, created_at
        FROM dashboard_widgets
        WHERE dashboard_id = $1
        ORDER BY created_at
      `, [dashboardId]);
      
      // Combine results
      const dashboard = result.rows[0];
      dashboard.widgets = widgetsResult.rows;
      
      return dashboard;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  },
  
  // Add widget to dashboard
  async addDashboardWidget(dashboardId, widgetData, userId) {
    const { widgetType, title, query, position, settings } = widgetData;
    
    const client = await pgPool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Check if user has access to dashboard's project
      const accessCheck = await client.query(`
        SELECT d.project_id
        FROM dashboards d
        JOIN project_members pm ON d.project_id = pm.project_id
        WHERE d.id = $1 AND pm.user_id = $2
      `, [dashboardId, userId]);
      
      if (accessCheck.rowCount === 0) {
        throw new Error('Access denied');
      }
      
      // Insert widget
      const result = await client.query(`
        INSERT INTO dashboard_widgets (
          dashboard_id, widget_type, title, query, position, settings
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, dashboard_id, widget_type, title, query, position, settings, created_at
      `, [
        dashboardId, 
        widgetType, 
        title, 
        JSON.stringify(query), 
        JSON.stringify(position), 
        JSON.stringify(settings || {})
      ]);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (err) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

// Export database functions
module.exports = {
  pgPool,
  redisClient,
  initializeDatabase,
  userDb,
  projectDb,
  eventTypeDb,
  dashboardDb
};
