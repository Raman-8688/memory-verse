-- ====================================================================
-- MEMORYVERSE - REAL GROUP MEMBERS & B.TECH SEED SCRIPT (PostgreSQL)
-- ====================================================================

DO $$
DECLARE
    v_raman_id UUID;
    v_ramesh_id UUID;
    v_govardhan_id UUID;
    v_shayam_id UUID;
    v_narasimha_id UUID;
    v_raju_id UUID;
    v_yugandar_id UUID;
    v_hemanth_id UUID;
    v_journey_id UUID;
    v_sec1_id UUID;
    v_sec2_id UUID;
    v_sec3_id UUID;
    v_sec4_id UUID;
    v_mem_id UUID;
    v_pass VARCHAR(255) := '$2a$10$wN9tZ32mY3MZZG5Rz1gMoei5a3Bfq0r7VbUaQ2Z7F.Zp3EaLzXN6O'; -- password123
BEGIN
    -- 1. Seed or Update Admin 1: Raman
    SELECT id INTO v_raman_id FROM users WHERE email = 'admin@memoryverse.com';
    IF v_raman_id IS NULL THEN
        v_raman_id := gen_random_uuid();
        INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
        VALUES (v_raman_id, 'admin@memoryverse.com', v_pass, 'Raman', 'ADMIN', 
                '/api/media/raw/users_details/raman.jpg', NOW(), NOW());
    ELSE
        UPDATE users SET full_name = 'Raman', role = 'ADMIN', avatar_url = '/api/media/raw/users_details/raman.jpg', password = v_pass
        WHERE id = v_raman_id;
    END IF;

    -- 2. Seed or Update Admin 2: Ramesh
    SELECT id INTO v_ramesh_id FROM users WHERE email = 'ramesh@memoryverse.com';
    IF v_ramesh_id IS NULL THEN
        -- Also check old ravi email
        SELECT id INTO v_ramesh_id FROM users WHERE email = 'ravi@memoryverse.com';
        IF v_ramesh_id IS NOT NULL THEN
            UPDATE users SET email = 'ramesh@memoryverse.com', full_name = 'Ramesh', role = 'ADMIN', 
                   avatar_url = '/api/media/raw/users_details/ramesh.jpg', password = v_pass WHERE id = v_ramesh_id;
        ELSE
            v_ramesh_id := gen_random_uuid();
            INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
            VALUES (v_ramesh_id, 'ramesh@memoryverse.com', v_pass, 'Ramesh', 'ADMIN', 
                    '/api/media/raw/users_details/ramesh.jpg', NOW(), NOW());
        END IF;
    ELSE
        UPDATE users SET full_name = 'Ramesh', role = 'ADMIN', avatar_url = '/api/media/raw/users_details/ramesh.jpg', password = v_pass
        WHERE id = v_ramesh_id;
    END IF;

    -- 3. Seed Members
    -- Govardhan
    SELECT id INTO v_govardhan_id FROM users WHERE email = 'govardhan@memoryverse.com';
    IF v_govardhan_id IS NULL THEN
        v_govardhan_id := gen_random_uuid();
        INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
        VALUES (v_govardhan_id, 'govardhan@memoryverse.com', v_pass, 'Govardhan', 'MEMBER', 
                '/api/media/raw/users_details/govardhan.jpg', NOW(), NOW());
    END IF;

    -- Shayam
    SELECT id INTO v_shayam_id FROM users WHERE email = 'shayam@memoryverse.com';
    IF v_shayam_id IS NULL THEN
        v_shayam_id := gen_random_uuid();
        INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
        VALUES (v_shayam_id, 'shayam@memoryverse.com', v_pass, 'Shayam', 'MEMBER', 
                '/api/media/raw/users_details/shayam.jpg', NOW(), NOW());
    END IF;

    -- Narasimha
    SELECT id INTO v_narasimha_id FROM users WHERE email = 'narasimha@memoryverse.com';
    IF v_narasimha_id IS NULL THEN
        v_narasimha_id := gen_random_uuid();
        INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
        VALUES (v_narasimha_id, 'narasimha@memoryverse.com', v_pass, 'Narasimha', 'MEMBER', 
                '/api/media/raw/users_details/narasimha.jpg', NOW(), NOW());
    END IF;

    -- Raju
    SELECT id INTO v_raju_id FROM users WHERE email = 'raju@memoryverse.com';
    IF v_raju_id IS NULL THEN
        v_raju_id := gen_random_uuid();
        INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
        VALUES (v_raju_id, 'raju@memoryverse.com', v_pass, 'Raju', 'MEMBER', 
                '/api/media/raw/users_details/raju.jpg', NOW(), NOW());
    END IF;

    -- Yugandar
    SELECT id INTO v_yugandar_id FROM users WHERE email = 'yugandar@memoryverse.com';
    IF v_yugandar_id IS NULL THEN
        v_yugandar_id := gen_random_uuid();
        INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
        VALUES (v_yugandar_id, 'yugandar@memoryverse.com', v_pass, 'Yugandar', 'MEMBER', 
                '/api/media/raw/users_details/yugandar.jpg', NOW(), NOW());
    END IF;

    -- Hemanth
    SELECT id INTO v_hemanth_id FROM users WHERE email = 'hemanth@memoryverse.com';
    IF v_hemanth_id IS NULL THEN
        v_hemanth_id := gen_random_uuid();
        INSERT INTO users (id, email, password, full_name, role, avatar_url, created_at, updated_at)
        VALUES (v_hemanth_id, 'hemanth@memoryverse.com', v_pass, 'Hemanth', 'MEMBER', 
                '/api/media/raw/users_details/hemanth.jpg', NOW(), NOW());
    END IF;

    -- 4. Create or Get Journey: B.Tech College Days
    SELECT id INTO v_journey_id FROM journeys WHERE slug = 'btech-college-days';
    IF v_journey_id IS NULL THEN
        v_journey_id := gen_random_uuid();
        INSERT INTO journeys (id, title, slug, description, cover_image_url, start_date, end_date, is_active, display_order, created_by, created_at, updated_at)
        VALUES (v_journey_id, 'B.Tech College Days', 'btech-college-days', 
                'Four unforgettable years of friendships, late-night coding, mess food debates, exam panics, and countless memories.',
                '/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg',
                '2020-08-01', '2024-05-31', true, 1, v_raman_id, NOW(), NOW());
    END IF;

    -- 5. Create or Get Journey Sections
    SELECT id INTO v_sec1_id FROM journey_sections WHERE journey_id = v_journey_id AND title LIKE 'First Year%';
    IF v_sec1_id IS NULL THEN
        v_sec1_id := gen_random_uuid();
        INSERT INTO journey_sections (id, title, description, start_date, end_date, display_order, journey_id, image_url, created_at)
        VALUES (v_sec1_id, 'First Year — Beginnings & Hostel Life', 'Fresh faces, campus orientations, late-night hostel hangouts, and surviving early 8 AM lectures.',
                '2020-08-01', '2021-05-31', 1, v_journey_id, '/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165025.jpg', NOW());
    ELSE
        UPDATE journey_sections SET image_url = '/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165025.jpg' WHERE id = v_sec1_id;
    END IF;

    SELECT id INTO v_sec2_id FROM journey_sections WHERE journey_id = v_journey_id AND title LIKE 'Second Year%';
    IF v_sec2_id IS NULL THEN
        v_sec2_id := gen_random_uuid();
        INSERT INTO journey_sections (id, title, description, start_date, end_date, display_order, journey_id, image_url, created_at)
        VALUES (v_sec2_id, 'Second Year — Campus Life & Coding', 'The core engineering grind, practical labs, canteen conversations, and hackathon all-nighters.',
                '2021-08-01', '2022-05-31', 2, v_journey_id, '/api/media/raw/images/btech-2024/second_year/IMG-20211231-WA0003.jpg', NOW());
    ELSE
        UPDATE journey_sections SET image_url = '/api/media/raw/images/btech-2024/second_year/IMG-20211231-WA0003.jpg' WHERE id = v_sec2_id;
    END IF;

    SELECT id INTO v_sec3_id FROM journey_sections WHERE journey_id = v_journey_id AND title LIKE 'Third Year%';
    IF v_sec3_id IS NULL THEN
        v_sec3_id := gen_random_uuid();
        INSERT INTO journey_sections (id, title, description, start_date, end_date, display_order, journey_id, image_url, created_at)
        VALUES (v_sec3_id, 'Third Year — Tech Fests & Road Trips', 'Annual college fests, cultural nights, sunset chai sessions, and unforgettable road trips with the gang.',
                '2022-08-01', '2023-05-31', 3, v_journey_id, '/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg', NOW());
    ELSE
        UPDATE journey_sections SET image_url = '/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg' WHERE id = v_sec3_id;
    END IF;

    SELECT id INTO v_sec4_id FROM journey_sections WHERE journey_id = v_journey_id AND title LIKE 'Final Year%';
    IF v_sec4_id IS NULL THEN
        v_sec4_id := gen_random_uuid();
        INSERT INTO journey_sections (id, title, description, start_date, end_date, display_order, journey_id, image_url, created_at)
        VALUES (v_sec4_id, 'Final Year — Capstone & Farewell', 'Major project submissions, placement celebrations, campus goodbyes, and the grand farewell party.',
                '2023-08-01', '2024-05-31', 4, v_journey_id, '/api/media/raw/images/btech-2024/final_year/IMG_20240523_155906.jpg', NOW());
    ELSE
        UPDATE journey_sections SET image_url = '/api/media/raw/images/btech-2024/final_year/IMG_20240523_155906.jpg' WHERE id = v_sec4_id;
    END IF;

    -- ====================================================================
    -- FIRST YEAR MEMORIES
    -- ====================================================================
    v_mem_id := gen_random_uuid();
    INSERT INTO memories (id, title, story, memory_date, location_name, is_featured, journey_id, section_id, created_by, created_at, updated_at)
    VALUES (v_mem_id, 
            'Fresher''s Intro & Campus Orientation', 
            'Stepping onto campus for the very first time. Everything was so overwhelming—the huge seminar halls, navigating between the departments, and meeting people who would eventually become brothers for life.',
            '2021-03-01', 'Auditorium & Admin Block', true, v_journey_id, v_sec1_id, v_raman_id, NOW(), NOW());
    
    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_ramesh_id) ON CONFLICT DO NOTHING;
    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_govardhan_id) ON CONFLICT DO NOTHING;
    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_shayam_id) ON CONFLICT DO NOTHING;

    INSERT INTO media (id, media_url, thumbnail_url, media_type, file_name, file_size_bytes, display_order, memory_id, created_at) VALUES
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165025.jpg', '/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165025.jpg', 'IMAGE', 'Screenshot_20210301_165025.jpg', 760107, 1, v_mem_id, NOW()),
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165109.jpg', '/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165109.jpg', 'IMAGE', 'Screenshot_20210301_165109.jpg', 167991, 2, v_mem_id, NOW()),
    (gen_random_uuid(), '/api/media/raw/videos/frist_year/video_20210815_002535_edit.mp4', '/api/media/raw/images/btech-2024/first_year/Screenshot_20210301_165025.jpg', 'VIDEO', 'video_20210815_002535_edit.mp4', 7260575, 3, v_mem_id, NOW());

    -- Second Year Memory
    v_mem_id := gen_random_uuid();
    INSERT INTO memories (id, title, story, memory_date, location_name, is_featured, journey_id, section_id, created_by, created_at, updated_at)
    VALUES (v_mem_id, 
            'New Year Eve & Campus Back in Action', 
            'Welcoming 2022 with the squad! We stayed up celebrating on the hostel terrace with speakers playing Punjabi beats, cold breeze, and Maggi cooked in an electric kettle.',
            '2021-12-31', 'Hostel Terrace & Campus Lawn', true, v_journey_id, v_sec2_id, v_raman_id, NOW(), NOW());

    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_ramesh_id) ON CONFLICT DO NOTHING;
    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_narasimha_id) ON CONFLICT DO NOTHING;
    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_raju_id) ON CONFLICT DO NOTHING;

    INSERT INTO media (id, media_url, thumbnail_url, media_type, file_name, file_size_bytes, display_order, memory_id, created_at) VALUES
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/second_year/IMG-20211231-WA0003.jpg', '/api/media/raw/images/btech-2024/second_year/IMG-20211231-WA0003.jpg', 'IMAGE', 'IMG-20211231-WA0003.jpg', 73500, 1, v_mem_id, NOW()),
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/second_year/IMG-20220105-WA0010.jpg', '/api/media/raw/images/btech-2024/second_year/IMG-20220105-WA0010.jpg', 'IMAGE', 'IMG-20220105-WA0010.jpg', 116311, 2, v_mem_id, NOW()),
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/second_year/IMG-20220105-WA0020.jpg', '/api/media/raw/images/btech-2024/second_year/IMG-20220105-WA0020.jpg', 'IMAGE', 'IMG-20220105-WA0020.jpg', 140881, 3, v_mem_id, NOW());

    -- Third Year Fest Memory
    v_mem_id := gen_random_uuid();
    INSERT INTO memories (id, title, story, memory_date, location_name, is_featured, journey_id, section_id, created_by, created_at, updated_at)
    VALUES (v_mem_id, 
            'Annual Cultural Fest — Lights, DJ & Raw Energy', 
            'The absolute pinnacle of our third year! Campus was glowing with neon lights, EDM music reverberating through the main grounds, and everyone screaming lyrics at the top of their lungs.',
            '2022-06-20', 'Main Campus Grounds', true, v_journey_id, v_sec3_id, v_raman_id, NOW(), NOW());

    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_ramesh_id) ON CONFLICT DO NOTHING;
    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_yugandar_id) ON CONFLICT DO NOTHING;
    INSERT INTO memory_tags (memory_id, user_id) VALUES (v_mem_id, v_hemanth_id) ON CONFLICT DO NOTHING;

    INSERT INTO media (id, media_url, thumbnail_url, media_type, file_name, file_size_bytes, display_order, memory_id, created_at) VALUES
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg', '/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg', 'IMAGE', 'IMG20220620104600.jpg', 3206647, 1, v_mem_id, NOW()),
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/third_year/IMG20220620104603.jpg', '/api/media/raw/images/btech-2024/third_year/IMG20220620104603.jpg', 'IMAGE', 'IMG20220620104603.jpg', 2739182, 2, v_mem_id, NOW()),
    (gen_random_uuid(), '/api/media/raw/images/btech-2024/third_year/IMG20220620104607.jpg', '/api/media/raw/images/btech-2024/third_year/IMG20220620104607.jpg', 'IMAGE', 'IMG20220620104607.jpg', 2477825, 3, v_mem_id, NOW()),
    (gen_random_uuid(), '/api/media/raw/videos/thred_year/Snapchat-404247653.mp4', '/api/media/raw/images/btech-2024/third_year/IMG20220620104600.jpg', 'VIDEO', 'Snapchat-404247653.mp4', 1453444, 4, v_mem_id, NOW());

    RAISE NOTICE 'SUCCESS: Real group members (Raman, Ramesh, Govardhan, Shayam, Narasimha, Raju, Yugandar, Hemanth) seeded successfully!';
END $$;
