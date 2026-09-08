-- ==============================================================================
-- MEMORYVERSE V4 ADD MOMENTS SCHEMA MIGRATION
-- ==============================================================================

-- 1. Moments Table (WhatsApp-status style quick share, isolated from memories)
CREATE TABLE IF NOT EXISTS moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_moments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_moments_author_id ON moments(author_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);

-- 2. Moment Media Table (Cascading media attachments for a moment)
CREATE TABLE IF NOT EXISTS moment_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID NOT NULL,
    media_url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_moment_media_moment FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_moment_media_moment_id ON moment_media(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_media_display_order ON moment_media(display_order);
