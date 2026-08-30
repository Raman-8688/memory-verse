# MemoryVerse — Complete Project Documentation & System Manual

> **"The years pass and the roads diverge, but these moments remain frozen in light."**  
> *MemoryVerse is a production-grade, full-stack digital nostalgia archive and storytelling application built for close friend circles, college batches, and milestone journeys.*

---

## 1. Executive Summary & Main Motive

### The Problem
In the modern era, group memories (college years, road trips, hostel life, celebrations) end up scattered, buried, and lost across fragmented WhatsApp group chats, disconnected Google Drive folders, and noisy algorithmic social media feeds. Traditional social networks focus on vanity metrics (likes, algorithmic engagement, public feeds) rather than genuine emotional nostalgia and collective group storytelling.

### The Solution: MemoryVerse
MemoryVerse was designed and built from the ground up as an **intimate, warm, editorial memory journal**. It treats memories not as raw database rows, but as **living chapters of a collective journey**.

### Core Pillars
1. **Narrative Chronology**: Rather than an endless disjointed feed, content is structured into **Journeys** (e.g., *"B.Tech College Days 2020–2024"*, *"Goa Graduation Trip"*) and subdivided into chronological **Sections / Chapters** (e.g., *"First Year — Beginnings & Hostel Life"*, *"Third Year — Tech Fests"*).
2. **Editorial Aesthetics**: Replaces sterile, corporate SaaS admin tables with an editorial magazine-inspired visual design — utilizing warm serif display typography (*Playfair Display / Fraunces*), clean neutral stone backgrounds (`#faf9f5`), rich amber accents (`#b45309`), and generous 8px spacing.
3. **Multi-Sensory Fullscreen Experience**: High-resolution photography and 60fps video clips presented with justified media layouts and an immersive, dark obsidian fullscreen lightbox viewer.
4. **Resilient Production Architecture**: Built with modern Spring Boot 3.3.4 (Java 21), Angular 18 Standalone, PostgreSQL 16, and fail-safe Redis caching that guarantees zero application downtime even if cache nodes go offline.

---

## 2. System Architecture & Tech Stack

```
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|          Angular 18/19 Standalone - Signal Reactive Architecture              |
|   (Dashboard, Journeys, Memory Stepper, Gallery Lightbox, Activity Center)    |
+---------------------------------------+---------------------------------------+
                                        | HTTP / JSON REST APIs (JWT Auth)
                                        v
+-------------------------------------------------------------------------------+
|                            SPRING BOOT 3.3 BACKEND                            |
|             Modular Monolith Architecture (Java 21, Spring Boot 3)            |
|                                                                               |
|  [Security / JWT]  ->  [Controllers]  ->  [Services]  ->  [JPA Repositories]  |
|         |                                     |                               |
|         v                                     v                               v
|  Stateless Auth                     Fail-Safe Redis Cache            Hibernate 6.5    |
+---------------------------------------+---------------------------------------+
                                        |
               +------------------------+------------------------+
               |                                                 |
               v                                                 v
    +-----------------------+                         +----------------------+
    |  PostgreSQL 16 Engine |                         |   Redis 7 Container  |
    |  Relational Database  |                         | Cache & Unread Count |
    +-----------------------+                         +----------------------+
```

### Backend Technology Stack
* **Language & Runtime**: Java 21 LTS (Virtual Threads ready, pattern matching, records).
* **Framework**: Spring Boot 3.3.4.
* **Data Access**: Spring Data JPA & Hibernate 6.5 with `JpaSpecificationExecutor` for multi-criteria dynamic filtering.
* **Security**: Spring Security 6 with stateless JWT Bearer Token filter and BCrypt password encryption.
* **Database**: PostgreSQL 16 with UUID primary keys and foreign key integrity.
* **Caching**: Redis 7 using `RedisCacheManager`, `GenericJackson2JsonRedisSerializer`, and a customized **`CacheErrorHandler`** providing graceful degradation (transparent database fallback if Redis is down).
* **Media Pipelines**:
  * Hybrid upload engine supporting **Cloudinary SDK** for cloud asset storage.
  * Native local high-throughput streaming controller (`/api/media/raw/**`) with HTTP `Cache-Control` headers for serving on-premise high-res media.

### Frontend Technology Stack
* **Framework**: Angular 18/19 (Standalone Components, Signals reactivity, typed reactive forms).
* **Component Library**: Angular Material (Customized theme removing default purple/indigo palettes in favor of amber/stone editorial tokens).
* **Styling**: SCSS featuring custom CSS custom properties (`--mv-primary: #b45309`, `--mv-bg-main: #faf9f5`, `--font-editorial`, `--radius-lg`).
* **Micro-Animations**: Shimmer skeletons, route fade-in transitions, and tactile hover lifts.
* **Routing**: Lazy-loaded child routes protected by functional `authGuard`.
* **State Management**: Signals-based state services (`NotificationStateService`, `AuthService`) avoiding RxJS boilerplate for synchronous UI counters and badges.

---

## 3. Detailed Module Breakdown

### 1. Identity & Access Management (`modules/auth`, `modules/user`)
* **Features**:
  * User registration and login returning signed HMAC-SHA256 JWT tokens (24-hour expiration).
  * Role-based permissions (`ADMIN` and `MEMBER`).
  * Current user profile endpoint (`GET /api/auth/me`).
  * Directory lookup (`GET /api/users`) for friend tagging in memories.

### 2. Journey & Chapter Management (`modules/journey`)
* **Features**:
  * Top-level container for a long-term chapter of life (e.g. college, road trips).
  * Auto-generated SEO-friendly URL slugs.
  * Hierarchical **Journey Sections** (e.g. *First Year*, *Second Year*, *Third Year*, *Final Year*).
  * Start and End dates for timeline generation.
  * Cover image presentation with aspect-ratio management.

### 3. Memory Domain & Stepper Creation (`modules/memory`)
* **Features**:
  * Multi-asset memory entity: Title, emotional narrative story, exact date, named location, coordinates, and featured memory flag.
  * Relational links: Many-to-One with `Journey` and optional `JourneySection`.
  * Many-to-Many `memory_tags` table connecting multiple friends to each memory.
  * **The 4-Step Creation Wizard** in Angular:
    1. *The Story*: Title, date, location, and emotional description.
    2. *The Journey*: Assigning to a Journey and selecting the specific chapter/section.
    3. *The Media*: Drag-and-drop multi-file upload with live image thumbnails and video previews.
    4. *Tag Friends & Review*: Selecting friends who were present, previewing the finalized editorial card, and publishing.

### 4. Storytelling Dashboard & Memory of the Day (`modules/dashboard`)
* **Features**:
  * **Single Optimized Aggregation Endpoint**: `GET /api/dashboard` returning statistics, milestones, and memory streams in a single network round-trip.
  * **Editorial Hero Banner**: Personalized daily greeting, date line, and narrative stats ribbon (*"1 Journey • 9 Memories • 38 Photographs • 5 Videos"*).
  * **Algorithmic "Memory of the Day"**: Prioritizes "On This Day" memories from previous years; falls back intelligently to highly rated or featured memories with an emotional quote.
  * **Interactive Horizontal Milestone Rail**: Chronological interactive rail allowing users to slide through key life milestones.
  * **Recent Memories Feed**: Grid of latest moments with uploader avatars and direct detail routing.

### 5. Media Gallery & Obsidian Fullscreen Lightbox (`modules/media`)
* **Features**:
  * Dedicated high-performance media archive (`GET /api/gallery`).
  * Dynamic filtering: Filter by Media Type (All / Photos / Videos) and Journey.
  * Justified masonry grid with visual video duration badges.
  * **Fullscreen Obsidian Lightbox Viewer**:
    * Immersive cinematic dark backdrop (`rgba(10, 10, 10, 0.96)`).
    * HTML5 Video player with controls or high-resolution zoomable image view.
    * Slide navigation with previous/next buttons and full **keyboard shortcuts** (`ArrowLeft`, `ArrowRight`, `Escape`).
    * Metadata drawer showing date, location, uploader avatar, memory story, and a *"View Story"* button.

### 6. Activity Center & Notification Stream (`modules/notification`)
* **Features**:
  * Synchronous event hooks: When a user creates a memory and tags friends, personalized notifications are instantly dispatched to all tagged users.
  * Redis-cached unread counts (`@Cacheable(CACHE_UNREAD_COUNT)`) with smart cache eviction on read actions.
  * **Navbar Bell Badge**: Real-time red badge on the top navbar bell icon displaying unread counts.
  * **Activity Center Page** (`/notifications`): Visual indicators for unread notifications, "Mark all as read" button, and direct navigation to the tagged memory upon clicking.

### 7. User Profile (`features/profile`)
* **Features**:
  * Profile card showing user avatar, name, email, and verified role badge.
  * **"Memories Tagged In"** Grid: Dedicated view pulling all memories across all journeys where the logged-in user is tagged.

### 8. Production Hardening & Global Error Handling
* **Features**:
  * Fail-safe Redis `CacheErrorHandler`: Application seamlessly continues using PostgreSQL even if Redis is stopped or fails to connect.
  * Global Angular `error.interceptor.ts`: Dispatches user-friendly toast notifications via Angular Material `MatSnackBar`.
  * Shimmer Skeleton Loaders: Prevents layout shift and blank flashes during initial data loading.
  * Mobile Bottom Navigation: Sticky thumb-friendly bottom navigation bar for mobile viewports.

---

## 4. How to Set Up and Run the Application

### Prerequisites
* **Java**: JDK 21 or higher installed (`java -version`).
* **Node.js**: Node.js 18+ and npm installed (`node -v`).
* **PostgreSQL**: PostgreSQL 16 running locally on port `5432`.
* **Redis**: Redis 7 running locally on port `6379` (optional — app will run with direct database fallback if Redis is offline).

---

### Step 1: Database Setup & Seeding

1. Create the PostgreSQL database:
   ```sql
   CREATE DATABASE memory_verse;
   ```

2. Seed the database with the pre-configured B.Tech College Days journey and local media:
   * Open pgAdmin, DBeaver, or psql command line.
   * Execute the script located at:
     ```text
     d:\memory-verse\seed_raw_data.sql
     ```
   * *The script creates the admin user, member user, the "B.Tech College Days" journey, 4 chapters, 9 memories, and links all photos and videos from `raw_data/`.*

---

### Step 2: Running the Spring Boot Backend

1. Open a terminal in `d:\memory-verse\backend`:
   ```powershell
   cd d:\memory-verse\backend
   ```
2. Start the Spring Boot application:
   ```powershell
   mvn spring-boot:run
   ```
3. The backend will start on **`http://localhost:8080`**.
4. Swagger API Documentation is available at:
   ```text
   http://localhost:8080/swagger-ui/index.html
   ```

---

### Step 3: Running the Angular Frontend

1. Open a new terminal in `d:\memory-verse\frontend`:
   ```powershell
   cd d:\memory-verse\frontend
   ```
2. Start the development server:
   ```powershell
   npm start
   ```
3. Open your browser and navigate to:
   ```text
   http://localhost:4200
   ```

---

### Step 4: Login Credentials

Use either of the pre-seeded accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@memoryverse.com` | `admin123` |
| **Member** | `ravi@memoryverse.com` | `admin123` |

*(Or click "Create an Account" on the login page to register a new user profile.)*

---

## 5. Complete REST API Reference

All API responses follow the standard envelope:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-08-30T14:15:00Z"
}
```

### Authentication & Users
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/login` | Authenticate user and issue JWT | No |
| `POST` | `/api/auth/register` | Register new user account | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user | Yes |
| `GET` | `/api/users` | List all registered members (for tagging) | Yes |

### Journeys & Sections
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/journeys` | Fetch all journeys with section count | Yes |
| `GET` | `/api/journeys/{id}` | Fetch journey details and chapters | Yes |
| `POST` | `/api/journeys` | Create new journey | Yes |
| `POST` | `/api/journeys/{id}/sections`| Add a new chapter/section to a journey | Yes |

### Memories
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/memories` | List memories (supports search & journey filters)| Yes |
| `GET` | `/api/memories/{id}` | Fetch memory detail by ID | Yes |
| `GET` | `/api/memories/tagged` | Fetch memories where a user is tagged | Yes |
| `POST` | `/api/memories` | Multipart upload (JSON metadata + files) | Yes |
| `POST` | `/api/memories/json` | Publish memory with direct media URLs | Yes |

### Dashboard & Gallery
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/dashboard` | Aggregated stats, timeline, Memory of the Day | Yes |
| `GET` | `/api/gallery` | Filterable media archive (Photos/Videos) | Yes |

### Media Streaming
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/media/files/{name}` | Stream local uploaded media | No (Public) |
| `GET` | `/api/media/raw/**` | Stream raw data images & MP4 videos | No (Public) |

### Notifications & Activity
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/notifications` | Paginated user notification list | Yes |
| `GET` | `/api/notifications/unread-count` | Unread notifications count (Cached) | Yes |
| `PUT` | `/api/notifications/{id}/read` | Mark single notification as read | Yes |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read | Yes |

---

## 6. Directory Structure Overview

```text
memory-verse/
│
├── PROJECT_DOCUMENTATION.md          <-- Complete System Manual (This file)
├── seed_raw_data.sql                 <-- PostgreSQL Seed Script (Journeys, Sections, Media)
├── docker-compose.yml                <-- Docker configuration for Postgres 16 & Redis 7
│
├── raw_data/                         <-- Local physical images and MP4 videos
│   ├── images/btech-2024/            <-- College photos by year (first_year, second_year, third_year)
│   └── videos/                       <-- College videos by year
│
├── backend/                          <-- Spring Boot 3.3.4 (Java 21)
│   ├── pom.xml
│   └── src/main/java/com/memoryverse/
│       ├── common/                   <-- ApiResponse, Exceptions, SecurityUtils, PagedResponse
│       ├── config/                   <-- SecurityConfig, RedisConfig, CloudinaryConfig
│       └── modules/
│           ├── auth/                 <-- JWT filter, TokenProvider, AuthService, AuthController
│           ├── user/                 <-- User entity, UserRepository, UserController
│           ├── journey/              <-- Journey & Section entities, Service, Controller
│           ├── memory/               <-- Memory entity, MemoryService, MemoryController
│           ├── media/                <-- Media entity, StorageService, GalleryService, Streaming
│           ├── dashboard/            <-- Aggregated DashboardService & DashboardController
│           └── notification/         <-- Notification entity, Service, Unread Cache, Controller
│
└── frontend/                         <-- Angular 18/19 Standalone
    ├── package.json
    ├── angular.json
    └── src/
        ├── styles.scss               <-- Design Tokens, Editorial Typography, Skeletons
        └── app/
            ├── core/                 <-- Services, Models, Auth Guards, HTTP Interceptors
            ├── layout/               <-- Navbar (Bell Badge), Sidebar, MobileNav, MainLayout
            └── features/
                ├── auth/             <-- Photo-centric Login & Registration UI
                ├── dashboard/        <-- Hero Masthead, Memory of the Day, Milestone Rail
                ├── journeys/         <-- Journey cards, Chapter views, Journey Form Dialog
                ├── memories/         <-- 4-Step Stepper Creation Wizard, Feed, Detail View
                ├── gallery/          <-- Justified Media Grid & Obsidian Lightbox Modal
                ├── notifications/    <-- Activity Center with Read/Unread indicators
                └── profile/          <-- User Profile & Tagged Memories Showcase
```

---

## 7. Conclusion

MemoryVerse stands as an enterprise-grade, full-stack application built with uncompromising architectural standards, thoughtful UX design, and robust resilience. Every photo, video, and story preserved in the application honors the friendships and memories that inspired it.
