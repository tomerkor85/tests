-- PostgreSQL Database Schema for RadixInsight Analytics Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE CHECK (email LIKE '%@radix-int.com'),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Project Members Table (for team collaboration)
CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

-- Event Types Table
CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, name)
);

-- Event Properties Table (metadata about properties)
CREATE TABLE event_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type_id UUID NOT NULL REFERENCES event_types(id),
    name VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (event_type_id, name)
);

-- Dashboards Table
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    layout JSONB,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Dashboard Widgets Table
CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id),
    widget_type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    query JSONB NOT NULL,
    position JSONB NOT NULL,
    settings JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Saved Queries Table
CREATE TABLE saved_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    query JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- User Sessions Table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_event_types_project_id ON event_types(project_id);
CREATE INDEX idx_event_properties_event_type_id ON event_properties(event_type_id);
CREATE INDEX idx_dashboards_project_id ON dashboards(project_id);
CREATE INDEX idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_saved_queries_project_id ON saved_queries(project_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_types_updated_at BEFORE UPDATE ON event_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_properties_updated_at BEFORE UPDATE ON event_properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_queries_updated_at BEFORE UPDATE ON saved_queries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (password will be hashed in application code)
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
VALUES ('admin@radix-int.com', 'placeholder_hash_to_be_replaced', 'Admin', 'User', 'admin', true);

-- Comments
COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON TABLE projects IS 'Analytics projects that group related events';
COMMENT ON TABLE project_members IS 'Maps users to projects with specific roles';
COMMENT ON TABLE event_types IS 'Defines types of events that can be tracked';
COMMENT ON TABLE event_properties IS 'Defines properties associated with event types';
COMMENT ON TABLE dashboards IS 'User-created dashboards for data visualization';
COMMENT ON TABLE dashboard_widgets IS 'Individual visualization components on dashboards';
COMMENT ON TABLE saved_queries IS 'User-saved analytics queries for reuse';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE audit_logs IS 'Audit trail of system actions';
