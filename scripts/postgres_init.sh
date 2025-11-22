#!/bin/bash
# PostgreSQL Initialization Script for Skyvern
# Security Level: PRODUCTION
# Created: November 8, 2025

set -e

echo "Initializing Skyvern database..."

# Create extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- UUID extension for task IDs
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create skyvern schema
    CREATE SCHEMA IF NOT EXISTS skyvern;

    -- Create tasks table
    CREATE TABLE IF NOT EXISTS skyvern.tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_file TEXT NOT NULL,
        parameters JSONB NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        extracted_data JSONB,
        error_message TEXT,
        execution_time_ms INTEGER
    );

    -- Create workflows table
    CREATE TABLE IF NOT EXISTS skyvern.workflows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_name TEXT NOT NULL,
        workflow_definition JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Create task_logs table for debugging
    CREATE TABLE IF NOT EXISTS skyvern.task_logs (
        id SERIAL PRIMARY KEY,
        task_id UUID REFERENCES skyvern.tasks(id) ON DELETE CASCADE,
        log_level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON skyvern.tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON skyvern.tasks(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON skyvern.task_logs(task_id);

    -- Grant permissions to skyvern user
    GRANT ALL PRIVILEGES ON SCHEMA skyvern TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA skyvern TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA skyvern TO $POSTGRES_USER;

    -- Set default privileges for future tables
    ALTER DEFAULT PRIVILEGES IN SCHEMA skyvern GRANT ALL ON TABLES TO $POSTGRES_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA skyvern GRANT ALL ON SEQUENCES TO $POSTGRES_USER;
EOSQL

echo "Database initialized successfully!"
