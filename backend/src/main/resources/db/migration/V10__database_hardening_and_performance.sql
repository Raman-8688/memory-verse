-- ==============================================================================
-- MEMORYVERSE V10 DATABASE HARDENING & PERFORMANCE MIGRATION
-- ==============================================================================

-- 1. Enable PostgreSQL Trigram Extension for High-Performance Search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Database-Level Idempotency Protection (P1-03)
-- Ensures duplicate clientMessageIds cannot be inserted concurrently within the same group for the same sender
CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_messages_group_sender_client_msg_id
    ON chat_messages(chat_group_id, sender_id, client_message_id)
    WHERE client_message_id IS NOT NULL;

-- 3. PostgreSQL Trigram GIN Search Indexes (P2-04)
-- Accelerates ILIKE '%query%' searches over message content and original filenames
CREATE INDEX IF NOT EXISTS idx_chat_messages_text_content_trgm
    ON chat_messages USING gin(text_content gin_trgm_ops)
    WHERE text_content IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_file_name_trgm
    ON chat_messages USING gin(original_file_name gin_trgm_ops)
    WHERE original_file_name IS NOT NULL AND is_deleted = FALSE;

-- 4. Unread Messages Query Optimization Index
-- Speeds up count of unread non-deleted messages after last_read_at timestamp
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_active_created
    ON chat_messages(chat_group_id, created_at DESC)
    WHERE is_deleted = FALSE;
