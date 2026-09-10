-- V7: Indexes for Group Message Search and Shared Media Gallery queries

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_media 
    ON chat_messages(chat_group_id, created_at DESC) 
    WHERE message_type = 'IMAGE' AND is_deleted = FALSE;
