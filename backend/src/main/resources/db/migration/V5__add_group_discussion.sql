-- ==============================================================================
-- MEMORYVERSE V5 GROUP DISCUSSION SCHEMA MIGRATION
-- ==============================================================================

-- 1. Chat Groups Table
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    avatar_url VARCHAR(1000),
    avatar_public_id VARCHAR(255),
    created_by_id UUID NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chat_groups_creator FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_created_by ON chat_groups(created_by_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_is_archived ON chat_groups(is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_groups_updated_at ON chat_groups(updated_at DESC);

-- 2. Chat Group Members Table
CREATE TABLE IF NOT EXISTS chat_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_read_message_id UUID,
    last_read_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_chat_group_members_group FOREIGN KEY (chat_group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_group_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_chat_group_members_group_user UNIQUE (chat_group_id, user_id),
    CONSTRAINT chk_chat_group_member_role CHECK (role IN ('ADMIN', 'MEMBER'))
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON chat_group_members(chat_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id ON chat_group_members(user_id);

-- 3. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_group_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    text_content TEXT,
    media_url VARCHAR(1000),
    media_public_id VARCHAR(255),
    thumbnail_url VARCHAR(1000),
    reply_to_message_id UUID,
    client_message_id VARCHAR(100),
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chat_messages_group FOREIGN KEY (chat_group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_reply_to FOREIGN KEY (reply_to_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
    CONSTRAINT chk_chat_message_type CHECK (message_type IN ('TEXT', 'IMAGE', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created ON chat_messages(chat_group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_message_id);

-- 4. Chat Message Reactions Table
CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction_code VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chat_reactions_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_chat_reactions_message_user_code UNIQUE (message_id, user_id, reaction_code)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_id ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_user_id ON chat_message_reactions(user_id);
