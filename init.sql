-- N.Crisis Database Initialization Script
-- Creates necessary tables for PII detection system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    zip_source VARCHAR(255),
    mime_type VARCHAR(100),
    size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    session_id UUID DEFAULT uuid_generate_v4(),
    total_files INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detections table
CREATE TABLE IF NOT EXISTS detections (
    id SERIAL PRIMARY KEY,
    titular VARCHAR(255) NOT NULL,
    documento VARCHAR(50) NOT NULL,
    valor TEXT NOT NULL,
    arquivo VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    context TEXT,
    is_false_positive BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    cnpj VARCHAR(18),
    domain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open',
    severity VARCHAR(20) DEFAULT 'medium',
    affected_data_types TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuration table
CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_detections_file_id ON detections(file_id);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp);
CREATE INDEX IF NOT EXISTS idx_detections_documento ON detections(documento);
CREATE INDEX IF NOT EXISTS idx_incidents_company ON incidents(company);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_detected_at ON incidents(detected_at);

-- Insert default configuration values
INSERT INTO configurations (key, value, description, category) VALUES
('MAX_UPLOAD_MB', '100', 'Maximum upload size in MB', 'upload'),
('ALLOWED_EXTS', '.zip,.pdf,.docx,.txt,.csv,.xlsx', 'Allowed file extensions', 'upload'),
('ZIP_MAX_DEPTH', '5', 'Maximum ZIP extraction depth', 'security'),
('ZIP_BOMB_RATIO', '100', 'Maximum compression ratio to prevent zip bombs', 'security'),
('ENABLE_PII_DETECTION', 'true', 'Enable PII detection functionality', 'detection'),
('CPF_VALIDATION', 'true', 'Enable CPF validation', 'detection'),
('CNPJ_VALIDATION', 'true', 'Enable CNPJ validation', 'detection'),
('EMAIL_VALIDATION', 'true', 'Enable email validation', 'detection'),
('PHONE_VALIDATION', 'true', 'Enable phone validation', 'detection')
ON CONFLICT (key) DO NOTHING;

-- Sample organizations for testing
INSERT INTO organizations (name, cnpj, domain) VALUES
('Empresa Exemplo Ltda', '12.345.678/0001-90', 'exemplo.com.br'),
('Tech Solutions SA', '98.765.432/0001-10', 'techsolutions.com.br'),
('Consultoria Digital', '11.222.333/0001-44', 'consultoriadigital.com.br')
ON CONFLICT (name) DO NOTHING;