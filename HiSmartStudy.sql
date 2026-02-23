CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS members (
    member_id BIGSERIAL PRIMARY KEY,
    login_id VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100),
    birthday VARCHAR(20),
    pin_code INT,
    social_type VARCHAR(20),
    total_mileage INT DEFAULT 0,
    saved_time_minute INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted_at BOOLEAN DEFAULT FALSE,
    name VARCHAR(30) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    kakao_id VARCHAR(255) UNIQUE,
    naver_id VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
    product_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    price INT NOT NULL,
    value INT NOT NULL,
    is_exposured BOOLEAN DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS seats (
    seat_id BIGINT PRIMARY KEY, -- 직접 ID를 지정하므로 BIGSERIAL 대신 BIGINT
    type VARCHAR(10) NOT NULL,
    is_status BOOLEAN DEFAULT TRUE,
    near_window BOOLEAN DEFAULT FALSE,
    corner_seat BOOLEAN DEFAULT FALSE,
    aisle_seat BOOLEAN DEFAULT FALSE,
    isolated BOOLEAN DEFAULT FALSE,
    near_beverage_table BOOLEAN DEFAULT FALSE,
    is_center BOOLEAN DEFAULT FALSE
);
insert into members (login_id, password, name, role, phone) values ('admin', '$2b$12$VDQdV2/RR3gSP8MNMrZPjucK7SftXGUFa2vXoDrSboIGVGqnfR6n2','관리자', 'admin', '010-1234-1234');
insert into members (name, role) values ('비회원', 'guest');
insert into members (login_id, password, name, role, phone, email) values ('hgd1234', '$2b$12$VDQdV2/RR3gSP8MNMrZPjucK7SftXGUFa2vXoDrSboIGVGqnfR6n2', '홍길동', 'user', '010-1111-1111', 'hong@naver.com');
INSERT INTO members (
    login_id,
    password,
    name,
    role,
    phone,
    email,
    created_at
)
SELECT
    'user' || lpad(gs::text, 3, '0') AS login_id,
    '$2b$12$VDQdV2/RR3gSP8MNMrZPjucK7SftXGUFa2vXoDrSboIGVGqnfR6n2' AS password,
    CASE (gs % 10)
        WHEN 0 THEN '김민준'
        WHEN 1 THEN '이서연'
        WHEN 2 THEN '박지훈'
        WHEN 3 THEN '최유진'
        WHEN 4 THEN '정우성'
        WHEN 5 THEN '한지민'
        WHEN 6 THEN '윤도현'
        WHEN 7 THEN '임수현'
        WHEN 8 THEN '오지훈'
        ELSE '서하늘'
        END AS name,
    'user' AS role,
    '010-2' || lpad(gs::text, 3, '0') || '-' || lpad((gs * 7 % 10000)::text, 4, '0') AS phone,
    'user' || lpad(gs::text, 3, '0') || '@naver.com' AS email,
    (
        TIMESTAMP '2025-11-01'
            + random() * (TIMESTAMP '2025-12-18' - TIMESTAMP '2025-11-01')
        ) AS created_at
FROM generate_series(1, 97) gs;

insert into products (name, type, price, value, is_exposured) values ('1시간권', '시간제',1500, 1, True);
insert into products (name, type, price, value, is_exposured) values ('2시간권', '시간제',3000, 2, True);
insert into products (name, type, price, value, is_exposured) values ('4시간권', '시간제', 6000, 4, True);
insert into products (name, type, price, value, is_exposured) values ('6시간권', '시간제', 9000, 6, True);
insert into products (name, type, price, value, is_exposured) values ('8시간권', '시간제', 12000, 8, True);
insert into products (name, type, price, value, is_exposured) values ('10시간권', '시간제', 15000, 10, True);
insert into products (name, type, price, value, is_exposured) values ('15일권', '기간제', 150000, 15, True);
insert into products (name, type, price, value, is_exposured) values ('30일권', '기간제', 280000, 30, True);
insert into products (name, type, price, value, is_exposured) values ('60일권', '기간제', 500000, 60, True);
insert into products (name, type, price, value, is_exposured) values ('90일권', '기간제', 700000, 90, True);
insert into products (name, type, price, value, is_exposured) values ('안보이는 이용권', '기간제', 77777, 77, False);

-- =============================================
-- 1. 고정석 (FIX) 1~20: 좌측 벽면 프라이빗 구역
-- =============================================
-- 벽면 완전 밀착 (가장 프라이빗)
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (1, 'fix', true, true, true, false, true, false, false),
                                                                                                                                 (2, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (3, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (4, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (5, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (6, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (7, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (8, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (9, 'fix', true, true, false, false, true, false, false),
                                                                                                                                 (10, 'fix', true, true, true, false, true, false, false);

-- 벽면 안쪽 열 (통로 접근성 좋음)
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (11, 'fix', true, false, false, true, true, false, false),
                                                                                                                                 (12, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (13, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (14, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (15, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (16, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (17, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (18, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (19, 'fix', true, false, false, false, true, false, false),
                                                                                                                                 (20, 'fix', true, false, false, true, true, false, false);

-- =============================================
-- 2. 자유석 (FREE) 21~100: 중앙 및 우측 구역
-- =============================================

-- 상단 창가석 (뷰가 좋은 자리)
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (21, 'free', true, true, true, false, false, false, false),
                                                                                                                                 (22, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (23, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (24, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (25, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (26, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (27, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (28, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (29, 'free', true, true, false, false, false, false, false),
                                                                                                                                 (30, 'free', true, true, true, false, false, false, false);

-- 중앙 대형 아일랜드 테이블 (개방감)
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (31, 'free', true, false, false, true, false, false, true), (32, 'free', true, false, false, false, false, false, true),
                                                                                                                                 (33, 'free', true, false, false, false, false, false, true), (34, 'free', true, false, false, false, false, false, true),
                                                                                                                                 (35, 'free', true, false, false, true, false, false, true), (36, 'free', true, false, false, true, false, false, true),
                                                                                                                                 (37, 'free', true, false, false, false, false, false, true), (38, 'free', true, false, false, false, false, false, true),
                                                                                                                                 (39, 'free', true, false, false, false, false, false, true), (40, 'free', true, false, false, true, false, false, true),
                                                                                                                                 (41, 'free', true, false, false, true, false, false, true), (42, 'free', true, false, false, false, false, false, true),
                                                                                                                                 (43, 'free', true, false, false, false, false, false, true), (44, 'free', true, false, false, false, false, false, true),
                                                                                                                                 (45, 'free', true, false, false, true, false, false, true), (46, 'free', true, false, false, true, false, false, true),
                                                                                                                                 (47, 'free', true, false, false, false, false, false, true), (48, 'free', true, false, false, false, false, false, true),
                                                                                                                                 (49, 'free', true, false, false, false, false, false, true), (50, 'free', true, false, false, true, false, false, true);

-- 우측 독립형/코너석 (조용한 구석)
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (51, 'free', true, false, true, false, true, false, false), (52, 'free', true, false, false, false, true, false, false),
                                                                                                                                 (53, 'free', true, false, false, false, true, false, false), (54, 'free', true, false, false, false, true, false, false),
                                                                                                                                 (55, 'free', true, false, false, false, true, false, false), (56, 'free', true, false, false, false, true, false, false),
                                                                                                                                 (57, 'free', true, false, false, false, true, false, false), (58, 'free', true, false, false, false, true, false, false),
                                                                                                                                 (59, 'free', true, false, false, false, true, false, false), (60, 'free', true, false, true, false, true, false, false);

-- 하단 중앙 그룹석
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (61, 'free', true, false, false, true, false, false, false), (62, 'free', true, false, false, false, false, false, false),
                                                                                                                                 (63, 'free', true, false, false, false, false, false, false), (64, 'free', true, false, false, false, false, false, false),
                                                                                                                                 (65, 'free', true, false, false, true, false, false, false), (66, 'free', true, false, false, true, false, false, false),
                                                                                                                                 (67, 'free', true, false, false, false, false, false, false), (68, 'free', true, false, false, false, false, false, false),
                                                                                                                                 (69, 'free', true, false, false, false, false, false, false), (70, 'free', true, false, false, true, false, false, false);

-- 우측 하단 음료대/입구 근처 (접근성 좋음)
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (71, 'free', true, false, false, true, false, true, false), (72, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (73, 'free', true, false, false, true, false, true, false), (74, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (75, 'free', true, false, false, true, false, true, false), (76, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (77, 'free', true, false, false, true, false, true, false), (78, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (79, 'free', true, false, false, true, false, true, false), (80, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (81, 'free', true, false, false, true, false, true, false), (82, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (83, 'free', true, false, false, true, false, true, false), (84, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (85, 'free', true, false, false, true, false, true, false), (86, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (87, 'free', true, false, false, true, false, true, false), (88, 'free', true, false, false, true, false, true, false),
                                                                                                                                 (89, 'free', true, false, false, true, false, true, false), (90, 'free', true, false, false, true, false, true, false);

-- 나머지 짜투리/통로석
INSERT INTO seats (seat_id, type, is_status, near_window, corner_seat, aisle_seat, isolated, near_beverage_table, is_center) VALUES
                                                                                                                                 (91, 'free', true, false, false, true, false, false, false), (92, 'free', true, false, false, true, false, false, false),
                                                                                                                                 (93, 'free', true, false, false, true, false, false, false), (94, 'free', true, false, false, true, false, false, false),
                                                                                                                                 (95, 'free', true, false, false, true, false, false, false), (96, 'free', true, false, false, true, false, false, false),
                                                                                                                                 (97, 'free', true, false, false, true, false, false, false), (98, 'free', true, false, false, true, false, false, false),
                                                                                                                                 (99, 'free', true, false, false, true, false, false, false), (100, 'free', true, false, false, true, false, false, false);

