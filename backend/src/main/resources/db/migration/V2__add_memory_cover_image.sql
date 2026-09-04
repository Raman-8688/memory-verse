-- ==============================================================================
-- MEMORYVERSE V2 - ADD DEDICATED MEMORY COVER IMAGE
-- ==============================================================================

ALTER TABLE memories ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);
