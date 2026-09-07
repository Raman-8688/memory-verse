-- V3__cleanup_duplicate_media.sql
-- Safe, idempotent cleanup of any duplicate media rows associated with the same memory
-- Retains the original (earliest) record and removes redundant duplicate entries

DELETE FROM media m1
WHERE m1.id IN (
    SELECT m.id
    FROM media m
    JOIN (
        SELECT memory_id, media_url, MIN(id::text) AS min_id
        FROM media
        WHERE memory_id IS NOT NULL AND media_url IS NOT NULL
        GROUP BY memory_id, media_url
        HAVING COUNT(*) > 1
    ) dupes ON m.memory_id = dupes.memory_id
           AND m.media_url = dupes.media_url
           AND m.id::text != dupes.min_id
);
