-- V9: Add video and file media metadata columns and index for group media/file galleries

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS media_duration DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_type_created
    ON chat_messages(chat_group_id, message_type, created_at DESC)
    WHERE is_deleted = FALSE;
