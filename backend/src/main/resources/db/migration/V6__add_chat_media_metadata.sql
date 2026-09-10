-- V6: Add chat media metadata columns for Image Sharing support

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS media_width INT,
    ADD COLUMN IF NOT EXISTS media_height INT,
    ADD COLUMN IF NOT EXISTS media_format VARCHAR(50),
    ADD COLUMN IF NOT EXISTS media_bytes BIGINT;
