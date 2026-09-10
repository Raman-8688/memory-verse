-- ==============================================================================
-- MEMORYVERSE V8 CHAT MENTIONS & NOTIFICATION ENHANCEMENTS MIGRATION
-- ==============================================================================

-- 1. Chat Message Mentions Table
CREATE TABLE IF NOT EXISTS chat_message_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    mentioned_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chat_mentions_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_mentions_user FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_chat_mentions_message_user UNIQUE (message_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_mentions_message_id ON chat_message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_user_created ON chat_message_mentions(mentioned_user_id, created_at DESC);

-- 2. Enhance Notifications Table with Chat Context Columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS preview VARCHAR(1000);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Add Foreign Keys for Notification Enhancements
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_group') THEN
        ALTER TABLE notifications ADD CONSTRAINT fk_notifications_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_message') THEN
        ALTER TABLE notifications ADD CONSTRAINT fk_notifications_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_sender') THEN
        ALTER TABLE notifications ADD CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Performance Indexes for Notification Lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_message_id ON notifications(message_id);
