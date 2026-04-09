-- Jurist AI Full Schema Migration for Neon Postgres
-- Run this once on a fresh Neon database
-- 
-- Usage:
--   psql "neon_connection_string" -f migrations/000_initial_schema.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
    job_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    source TEXT,
    source_type VARCHAR(32),
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    error TEXT,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    document_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_indexed BOOLEAN NOT NULL DEFAULT FALSE,
    indexed_at TIMESTAMP WITH TIME ZONE,
    clause_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Create clause_embeddings table
CREATE TABLE IF NOT EXISTS clause_embeddings (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    clause_id INTEGER NOT NULL,
    clause_text TEXT NOT NULL,
    section_heading TEXT,
    risk_categories JSONB DEFAULT '[]' NOT NULL,
    severity_score DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    is_risky BOOLEAN DEFAULT FALSE NOT NULL,
    has_negation BOOLEAN DEFAULT FALSE NOT NULL,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clause_embeddings_session ON clause_embeddings(session_id);
CREATE INDEX IF NOT EXISTS idx_clause_embeddings_embedding ON clause_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_clause_embeddings_risky ON clause_embeddings(session_id) WHERE is_risky = TRUE;

-- Create compare_sessions table
CREATE TABLE IF NOT EXISTS compare_sessions (
    compare_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    session_id_a UUID NOT NULL,
    session_id_b UUID NOT NULL,
    job_id_a UUID NOT NULL,
    job_id_b UUID NOT NULL,
    source_a TEXT,
    source_b TEXT,
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compare_sessions_user_id ON compare_sessions(user_id);

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: All tables created successfully';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '✓ users table created';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analyses') THEN
        RAISE NOTICE '✓ analyses table created';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        RAISE NOTICE '✓ chat_sessions table created';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        RAISE NOTICE '✓ chat_messages table created';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clause_embeddings') THEN
        RAISE NOTICE '✓ clause_embeddings table created';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compare_sessions') THEN
        RAISE NOTICE '✓ compare_sessions table created';
    END IF;
END $$;
