-- Jurist AI RAG System Migration
-- Run this on Railway Postgres after deploying the new code
-- 
-- This migration:
-- 1. Enables pgvector extension
-- 2. Adds indexing columns to chat_sessions
-- 3. Creates clause_embeddings table
-- 4. Creates indexes for fast retrieval

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add indexing columns to chat_sessions table
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS is_indexed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clause_count INTEGER DEFAULT 0 NOT NULL;

-- Create clause_embeddings table
CREATE TABLE IF NOT EXISTS clause_embeddings (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    clause_id INTEGER NOT NULL,
    clause_text TEXT NOT NULL,
    section_heading TEXT,
    risk_categories JSONB DEFAULT '[]' NOT NULL,
    severity_score DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    is_risky BOOLEAN DEFAULT FALSE NOT NULL,
    embedding vector(384) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
);

-- Index for fast similarity search (IVFFLAT is faster for large datasets)
CREATE INDEX IF NOT EXISTS idx_clause_embeddings_embedding 
ON clause_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for session filtering
CREATE INDEX IF NOT EXISTS idx_clause_embeddings_session 
ON clause_embeddings(session_id);

-- Composite index for risk filtering
CREATE INDEX IF NOT EXISTS idx_clause_embeddings_risky 
ON clause_embeddings(session_id) 
WHERE is_risky = TRUE;

-- Grant permissions (Railway handles this automatically, but good practice)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON clause_embeddings TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE clause_embeddings_id_seq TO your_app_user;

-- Verify the migration
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'clause_embeddings'
    ) THEN
        RAISE NOTICE 'Migration successful: clause_embeddings table created';
    ELSE
        RAISE WARNING 'Migration may have failed: clause_embeddings table not found';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' AND column_name = 'is_indexed'
    ) THEN
        RAISE NOTICE 'Migration successful: chat_sessions columns added';
    ELSE
        RAISE WARNING 'Migration may have failed: chat_sessions columns not found';
    END IF;
END $$;
