-- ==============================================================================
-- MEMORYVERSE V1 INITIAL SCHEMA MIGRATION (PostgreSQL 16)
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Journeys Table
CREATE TABLE IF NOT EXISTS journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_journeys_slug UNIQUE (slug),
    CONSTRAINT fk_journeys_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_journeys_slug ON journeys(slug);
CREATE INDEX IF NOT EXISTS idx_journeys_display_order ON journeys(display_order);
CREATE INDEX IF NOT EXISTS idx_journeys_deleted_at ON journeys(deleted_at);

-- 3. Journey Sections Table
CREATE TABLE IF NOT EXISTS journey_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sections_journey FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sections_journey_id ON journey_sections(journey_id);

-- 4. Memories Table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    story TEXT NOT NULL,
    memory_date DATE NOT NULL,
    location_name VARCHAR(200),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_level VARCHAR(30) NOT NULL DEFAULT 'CIRCLE_COMPANIONS',
    deleted_at TIMESTAMP WITH TIME ZONE,
    journey_id UUID NOT NULL,
    section_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_memories_journey FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memories_section FOREIGN KEY (section_id) REFERENCES journey_sections(id) ON DELETE SET NULL,
    CONSTRAINT fk_memories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_memories_memory_date ON memories(memory_date);
CREATE INDEX IF NOT EXISTS idx_memories_journey_id ON memories(journey_id);
CREATE INDEX IF NOT EXISTS idx_memories_section_id ON memories(section_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_by ON memories(created_by);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_is_favorite ON memories(is_favorite);
CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON memories(deleted_at);

-- 5. Media Table
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID,
    media_url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
    public_id VARCHAR(255),
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    transcript TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_media_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_memory_id ON media(memory_id);
CREATE INDEX IF NOT EXISTS idx_media_display_order ON media(display_order);

-- 6. Memory Tagged Users Table
CREATE TABLE IF NOT EXISTS memory_tagged_users (
    memory_id UUID NOT NULL,
    user_id UUID NOT NULL,
    PRIMARY KEY (memory_id, user_id),
    CONSTRAINT fk_tagged_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT fk_tagged_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Collections Table
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_collections_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_collections_created_by ON collections(created_by);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at);

-- 8. Collection Memories Table
CREATE TABLE IF NOT EXISTS collection_memories (
    collection_id UUID NOT NULL,
    memory_id UUID NOT NULL,
    PRIMARY KEY (collection_id, memory_id),
    CONSTRAINT fk_col_mem_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    CONSTRAINT fk_col_mem_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_col_mem_collection ON collection_memories(collection_id);
CREATE INDEX IF NOT EXISTS idx_col_mem_memory ON collection_memories(memory_id);

-- 9. Memory Comments Table
CREATE TABLE IF NOT EXISTS memory_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_comments_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_memory_comments_memory_id ON memory_comments(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_created_at ON memory_comments(created_at);

-- 10. Memory Reactions Table
CREATE TABLE IF NOT EXISTS memory_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL,
    user_id UUID NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_memory_user_emoji UNIQUE (memory_id, user_id, emoji),
    CONSTRAINT fk_reactions_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_memory_reactions_memory_id ON memory_reactions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_reactions_emoji ON memory_reactions(emoji);

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    message VARCHAR(500) NOT NULL,
    type VARCHAR(30) NOT NULL,
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 12. Shared Links Table
CREATE TABLE IF NOT EXISTS shared_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(64) NOT NULL,
    resource_type VARCHAR(30) NOT NULL,
    resource_id UUID NOT NULL,
    created_by_id UUID NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_shared_links_token UNIQUE (token),
    CONSTRAINT fk_shared_links_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_resource ON shared_links(resource_type, resource_id);

-- 13. AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_ai_conv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at);

-- 14. AI Messages Table
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ai_msg_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);
