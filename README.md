# 📖 MemoryVerse — Private Nostalgia & Digital Memory Archive

<div align="center">

![Java 21](https://img.shields.io/badge/Java-21_LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Spring AI](https://img.shields.io/badge/Spring_AI-1.0.0--M4-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-18_Standalone-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_/_Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

<br/>

> *"The years pass and the roads diverge, but these moments remain frozen in light."*  
> **MemoryVerse** is a private, editorial digital nostalgia platform and group memory journal designed for friends, batchmates, and families to preserve, organize, search, and relive their shared journeys across years.

</div>

---

## 📑 Table of Contents
1. [Overview & Philosophy](#-overview--philosophy)
2. [Key Capabilities & Features](#-key-capabilities--features)
3. [Architecture & Tech Stack](#-architecture--tech-stack)
4. [Project Directory Structure](#-project-directory-structure)
5. [Frontend Architecture](#-frontend-architecture)
6. [Backend Architecture](#-backend-architecture)
7. [Environment Profiles (Dev vs. Prod)](#-environment-profiles-dev-vs-prod)
8. [Getting Started & Local Setup](#-getting-started--local-setup)
9. [Default Seed Accounts](#-default-seed-accounts)
10. [REST API Reference](#-rest-api-reference)
11. [Free-Tier Cloud Deployment Guide](#-free-tier-cloud-deployment-guide)
12. [Security & Production Hardening](#-security--production-hardening)

---

## 🌟 Overview & Philosophy

Unlike algorithmic social networks or unstructured cloud drives, **MemoryVerse** treats group memories not as isolated media files or database rows, but as **living chapters of a shared human journey**.

### Core Highlights:
* 🏛️ **Chronological Journeys & Chapters**: Organize moments into life chapters (*College Days*, *Road Trips*, *Reunions*) with milestones and member tagging.
* 📸 **Direct Multi-Media Uploads**: Pick photos, videos, and voice memos directly from your mobile camera, device gallery, or computer with instant client-side previews.
* 🗺️ **Places Directory & Interactive Memory Map**: Visual geographic archive powered by Leaflet.js showing where your memories took place around the world.
* 👥 **People Directory & Companion Tagging**: Relive moments through the lens of who was with you.
* 📖 **Storybook Presentation Mode**: Turn journeys into a cinematic coffee-table digital flipbook with ambient audio memos.
* 💌 **Archival Keepsake Export & Public Sharing**: Download complete ZIP memory archives or view standalone single-file HTML Keepsake Books with one click. Share memories securely via tokenized public links.
* 💬 **Collaborative Reminiscing**: Margin note commentary, voice notes, and lightweight emoji reactions (`❤️`, `🔥`, `😂`, `🥹`, `✨`).
* 🧠 **AI Memory Assistant (Spring AI & NVIDIA NIM)**: Grounded natural-language memory retrieval via JPA Criteria Specifications with zero hallucinations.
* 📱 **Progressive Web App (PWA)**: Installable on iOS/Android with hardware camera bridging (`capture="environment"`).
* 🎨 **Warm Editorial Design System**: Tailored stone palette (`#fcfbf9`), amber/cognac (`#b45309`), espresso accents (`#78350f`), and Cormorant Garamond typography.

---

## ⚡ Key Capabilities & Features

```
                                ┌────────────────────────┐
                                │   MemoryVerse Core     │
                                └───────────┬────────────┘
         ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
         ▼                  ▼                               ▼                  ▼
┌─────────────────┐ ┌───────────────┐              ┌─────────────────┐ ┌─────────────────┐
│    Journeys     │ │  AI Assistant │              │  Memory Map &   │ │ Keepsake Books  │
│   & Storybook   │ │   Dual-Mode   │              │ People Directory│ │ & Shared Links  │
└─────────────────┘ └───────────────┘              └─────────────────┘ └─────────────────┘
```

### 1. Chronological Journeys & Storybook Mode
* **Journeys & Chapters**: Group memories into multi-year chapters with cover photography, date ranges, and contributor lists.
* **Storybook Presentation (`/journeys/:id/storybook`)**: A cinematic full-screen coffee-table book view designed for group presentations and family slideshows.
* **In-Place Reactive Updates**: Edit journeys and chapters seamlessly using Angular Signals without page reloads.

### 2. Places & Interactive Memory Map (`/places`)
* **Leaflet Map Integration**: Dynamic clustering and interactive pins on a dark/editorial map theme.
* **Location Aggregation**: Cards grouped by city/region with memory counts and quick navigation directly into the filtered Timeline.

### 3. People Directory & Tagging (`/people`)
* **Social Archiving**: Explore memories tagged with specific friends, batchmates, and family members.
* **Contribution Metrics**: View memories authored by or featuring each member.

### 4. Collaborative Nostalgia (Comments, Reactions & Audio Notes)
* **Journal Margin Notes**: Elegant comment stream rendered as thoughtful diary notes.
* **Emoji Reaction Bar**: Express emotion instantly with inline reaction tallies.
* **Voice Memos**: Attach spoken audio clips (`.mp3`, `.wav`, `.m4a`) to preserve the emotion of the moment.

### 5. Archival Keepsakes & Public Sharing
* **Keepsake HTML Books**: Single-file, zero-dependency HTML books with embedded metadata and styling for offline preservation.
* **ZIP Archive Generator**: One-click download containing all original media assets, voice memos, and structured JSON metadata.
* **Tokenized Safe Links (`/public/s/:token`)**: Share specific memories or journeys with external family and friends without requiring an account.

### 6. Dual-Mode AI Memory Assistant
Powered by **Spring AI** and the **NVIDIA NIM API** (`meta/llama-3.1-70b-instruct`):
* **Mode A — Grounded Memory Search**:
  1. Translates natural queries into structured `MemorySearchCriteria` (dates, keywords, locations, tagged users).
  2. Dynamically queries PostgreSQL using type-safe **JPA Criteria Specifications**.
  3. **Zero-Hallucination Guardrail**: If no memories match the search criteria, the assistant immediately returns a warm response *without querying the LLM*.
  4. Renders responsive inline memory cards, location pills, and media grids in the chat feed.
* **Mode B — Conversational Companion**: Friendly nostalgic discussion about past events and stories.
* **Rolling Window Context**: Tracks conversation history in PostgreSQL (`AiConversation` & `AiMessage`) using a 6-message rolling window.

### 7. Collections, Favorites, & "On This Day"
* **Collections (`/collections`)**: Curate custom memory albums across different journeys (e.g., *"Best Sunsets"*, *"Hostel Nights"*).
* **Favorites (`/favorites`)**: One-tap bookmarking for your most cherished moments.
* **On This Day (`/on-this-day`)**: Daily nostalgia flash showing memories created on this calendar day in past years.
* **Trash & Recovery Bin (`/trash`)**: Two-tier soft deletion with 30-day recovery.

---

## 🏗️ Architecture & Tech Stack

MemoryVerse is designed as an enterprise **Modular Monolith** for low operational overhead and maximum performance:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MEMORYVERSE ARCHITECTURE                                       │
├────────────────────────┬────────────────────────────────────────┬────────────────────────────────┤
│    CLIENT INTERFACE    │           APPLICATION TIER             │          STORAGE TIER          │
├────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ • Angular 18 Standalone│ • Spring Boot 3.3.4 (Java 21 LTS)      │ • PostgreSQL 16 / Neon DB      │
│ • Progressive Web App  │ • Spring AI 1.0.0-M4                   │   (Dynamic JPA Specifications) │
│ • Angular Material 18  │ • Spring Security 6 (Stateless JWT)    │ • Redis 7                      │
│ • Signals State Store  │ • NVIDIA NIM Multi-Model Client        │   (Caching with Fail-Safe DB   │
│ • Leaflet.js Mapping   │ • Zip/HTML Keepsake Export Engine      │    Fallback)                   │
│ • Obsidian Lightbox    │ • Resilient Global Exception Handler   │ • Cloudinary / Local Disk      │
│ • Image Fallback (SVG) │ • Cloudinary SDK (Dual Storage Mode)   │   (Dual-Mode Media Storage)    │
└────────────────────────┴────────────────────────────────────────┴────────────────────────────────┘
```

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend Framework** | **Spring Boot 3.3.4** | Java 21 LTS, Virtual Threads ready, Modular Packages |
| **AI Framework** | **Spring AI 1.0.0-M4** | Structured output parsing (`BeanOutputConverter`), Prompt Templates |
| **LLM Provider** | **NVIDIA NIM API** | Meta Llama 3.1 70B / 8B, Mistral 7B, Gemma 2 |
| **Database** | **PostgreSQL 16 / Neon** | Relational schema, UUID primary keys, dynamic Criteria queries |
| **Cache Layer** | **Redis 7** | Cache-aside pattern with automatic fail-safe database fallback |
| **Media Storage** | **Cloudinary + Local** | Cloud CDN storage with automatic local disk fallback (`uploads/media`) |
| **Frontend Framework** | **Angular 18** | 100% Standalone Components, Signal reactivity, Application Builder |
| **Maps & Geospatial** | **Leaflet 1.9.4** | OpenStreetMap integration, responsive pin clusters |
| **Mobile** | **PWA + HTML5** | Standalone manifest, Touch Quick Capture, Hardware Camera Bridging |

---

## 📂 Project Directory Structure

```
memory-verse/
├── docker-compose.yml              # Local PostgreSQL 16 & Redis 7 containers
├── seed_raw_data.sql               # Complete SQL database seed script
├── PROJECT_DOCUMENTATION.md        # Technical specifications & design docs
├── ROADMAP_AND_PROGRESS.md         # Implementation phase tracking & audit logs
├── README.md                       # Main repository documentation
├── users&admins_details/           # User avatar photographs & reference accounts
│
├── backend/                        # Spring Boot 3.3.4 Application (Java 21 LTS)
│   ├── pom.xml                     # Maven dependencies (Spring AI, Security, Redis, Cloudinary)
│   └── src/main/
│       ├── java/com/memoryverse/
│       │   ├── MemoryVerseApplication.java # Spring Boot entry point
│       │   ├── config/             # SecurityConfig, CacheConfig, DataInitializer, AppConfig
│       │   ├── controller/         # REST API Controllers (Memory, Journey, AI, Export, etc.)
│       │   ├── dto/                # Request/Response DTOs, Search Criteria, Aggregations
│       │   ├── entity/             # JPA Entities (User, Memory, Journey, Comment, Reaction, etc.)
│       │   ├── exception/          # GlobalExceptionHandler & custom domain exceptions
│       │   ├── integration/        # External integrations
│       │   │   ├── ai/             # NvidiaNimClient, ModelProvider, PromptTemplates
│       │   │   └── storage/        # CloudinaryService & LocalStorageService
│       │   ├── repository/         # Spring Data Repositories & JPA Criteria Specifications
│       │   ├── security/           # JwtAuthFilter, JwtTokenProvider, CustomUserDetailsService
│       │   ├── service/            # Business logic interfaces & implementation classes
│       │   │   └── impl/           # Service implementation layer
│       │   └── util/               # SecurityUtils, SlugUtils, date helpers
│       └── resources/
│           ├── application.yml     # Base configuration (multipart, common settings)
│           ├── application-dev.yml # Local development profile
│           ├── application-prod.yml# Cloud production profile (Neon Postgres, Env Vars)
│           └── application-secrets.yml # Git-ignored local secrets (DB, API keys)
│
└── frontend/                       # Angular 18 Standalone Web & PWA Application
    ├── angular.json                # Angular CLI configuration & production fileReplacements
    ├── package.json                # Dependencies (@angular/material, leaflet, rxjs, etc.)
    ├── tsconfig.json               # TypeScript path mappings (@core, @features, @layout, @env)
    ├── vercel.json                 # Vercel SPA rewrite configuration
    ├── netlify.toml                # Netlify SPA redirect configuration
    ├── nginx.conf                  # Nginx reverse proxy configuration for Docker
    ├── Dockerfile                  # Containerized multi-stage build definition
    ├── proxy.conf.json             # Dev server API proxy configuration
    ├── public/                     # Static assets, web manifest, _redirects
    └── src/
        ├── environments/           # Environment profiles
        │   ├── environment.ts      # Local development (http://localhost:8080/api)
        │   └── environment.prod.ts # Cloud production (/api)
        ├── manifest.webmanifest    # PWA installable manifest
        ├── styles.scss             # Design system tokens (stone, amber, espresso, typography)
        └── app/
            ├── app.component.ts    # Root application component
            ├── app.config.ts       # Application providers, animations, interceptors
            ├── app.routes.ts       # Standalone routing tree with lazy loading
            ├── core/               # Singletons, auth guards, interceptors, models
            │   ├── auth/           # AuthService (Signals), AuthGuard, RoleGuard
            │   ├── interceptors/   # JwtInterceptor, ErrorInterceptor
            │   ├── models/         # TypeScript data models & API response interfaces
            │   └── services/       # ApiService, MemoryService, JourneyService, etc.
            ├── layout/             # Shell navigation & structural layouts
            │   ├── main-layout/    # Main application shell with navbar & sidebar
            │   ├── navbar/         # Header navigation bar & user avatar dropdown
            │   ├── sidebar/        # Desktop collapsible menu (ordered by priority)
            │   └── mobile-nav/     # Mobile bottom navigation bar
            ├── features/           # Standalone feature modules & pages
            │   ├── admin/          # Admin management dashboard
            │   ├── assistant/      # AI Assistant chat feed & model selector
            │   ├── auth/           # Login & Registration views
            │   ├── capture/        # Touch Quick Capture & Review screen
            │   ├── collections/    # User Curated Memory Albums
            │   ├── dashboard/      # Editorial masthead, milestones & statistics
            │   ├── favorites/      # Bookmarked memories
            │   ├── gallery/        # Masonry photo & video grid
            │   ├── guide/          # Interactive onboarding user guide
            │   ├── journeys/       # Journey list, detail, and Storybook flipbook
            │   ├── map/            # Interactive Leaflet memory map
            │   ├── memories/       # Memory feed, detail, and multi-step creator
            │   ├── notifications/  # Tag & activity notification center
            │   ├── on-this-day/    # Calendar nostalgia flashback
            │   ├── people/         # Companion directory & tagged member explorer
            │   ├── places/         # Geographic location cards & memory clusters
            │   ├── profile/        # User profile & avatar photograph upload
            │   ├── share/          # Public shared link preview & guest viewer
            │   ├── timeline/       # Global chronological memory stream
            │   └── trash/          # Soft-deleted memory recovery bin (30-day lifecycle)
            └── shared/             # Reusable UI components & directives
                ├── components/     # Lightbox modal, empty states, confirm dialogs
                ├── directives/     # ImageFallbackDirective (mvFallback)
                └── pipes/          # Relative time, safe HTML, formatting pipes
```

---

## 🖥️ Frontend Architecture

* **Signal State Management**: Core state (`currentUser`, `token`, active conversation, upload progress) is driven by Angular Signals (`signal`, `computed`) for fine-grained reactivity.
* **Unified API Client**: All HTTP requests flow through `ApiService`, which dynamically binds to `environment.apiUrl`.
* **Centralized Environment Profiles**: Production builds automatically substitute `environment.ts` with `environment.prod.ts` via `fileReplacements` in `angular.json`.
* **Leaflet Mapping**: Interactive Leaflet maps with custom styling and tile caching.
* **Resilient Image Fallback (`mvFallback`)**: Custom standalone directive intercepts broken media URLs and seamlessly displays branded SVG placeholders.

---

## ⚙️ Backend Architecture

* **Layered Clean Architecture**: Structured cleanly into `controller`, `service` (with `impl`), `repository`, `entity`, `dto`, `integration`, and `security` layers.
* **Zero-Hallucination AI Pipeline**: Natural language queries are parsed into type-safe JPA Criteria queries before invoking the LLM, ensuring 100% verified facts.
* **Dual Storage Engine**: Automatically saves media files to Cloudinary CDN if credentials exist, or falls back to local disk (`uploads/media/`).
* **Connection Pooling Optimization**: Tuned HikariCP pool (`maximum-pool-size: 5`, `minimum-idle: 1`, `idle-timeout: 30000`) for serverless databases like Neon.
* **Fail-Safe Caching**: Transparent fallback to PostgreSQL queries if Redis is offline.

---

## 🔧 Environment Profiles (Dev vs. Prod)

MemoryVerse separates development and production profiles cleanly:

### Spring Boot Backend

| Setting | Development (`application-dev.yml`) | Production (`application-prod.yml`) |
| :--- | :--- | :--- |
| **Active Profile** | `dev` | `prod` (via `SPRING_PROFILES_ACTIVE=prod`) |
| **Datasource URL** | `jdbc:postgresql://localhost:5432/memoryverse` | `${SPRING_DATASOURCE_URL}` (Neon Postgres URL) |
| **Hikari Pool Size**| Default (10) | `5` (Optimized for Neon connection limits) |
| **Hibernate SQL** | `show-sql: true` | `show-sql: false` |
| **JWT Secret** | Local fallback key | `${JWT_SECRET}` |
| **CORS Origins** | `http://localhost:4200` | Dynamic from `${CORS_ALLOWED_ORIGINS}` + Cloud domains |

### Angular Frontend

| Setting | Development (`environment.ts`) | Production (`environment.prod.ts`) |
| :--- | :--- | :--- |
| **Production Flag**| `production: false` | `production: true` |
| **API Base URL** | `http://localhost:8080/api` | `/api` (or custom backend URL) |
| **Build Target** | `ng build --configuration=development` | `npm run build` (`ng build --configuration=production`) |

---

## 🚀 Getting Started & Local Setup

Get MemoryVerse running locally in **under 10 minutes**.

### 1. Prerequisites
* **Java**: JDK 21 LTS ([Eclipse Temurin 21](https://adoptium.net/))
* **Node.js**: v18.19+ or v20+ ([Node.js](https://nodejs.org/))
* **Docker & Docker Compose** (or local PostgreSQL 16 & Redis 7)

---

### 2. Clone the Repository
```bash
git clone https://github.com/Raman-8688/memory-verse.git
cd memory-verse
```

---

### 3. Start Database & Redis (Docker)
```bash
docker-compose up -d
```
*Starts PostgreSQL on port `5432` and Redis on port `6379`.*

---

### 4. Run the Backend
```bash
cd backend
./mvnw spring-boot:run
```
*(On Windows PowerShell: `.\mvnw.cmd spring-boot:run`)*

The backend will start at **`http://localhost:8080`**.  
On first startup, `DataInitializer` automatically seeds default accounts, journeys, chapters, memories, and milestones.

---

### 5. Run the Frontend
In a separate terminal window:
```bash
cd frontend
npm install
npm start
```
The application will launch at **`http://localhost:4200`**.

---

## 👥 Default Seed Accounts

The system is pre-seeded with sample members and admins:

| Full Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Raman** | `ADMIN` | `admin@memoryverse.com` | `password123` |
| **Ramesh** | `ADMIN` | `ramesh@memoryverse.com` | `password123` |
| **Govardhan** | `MEMBER` | `govardhan@memoryverse.com` | `password123` |
| **Shayam** | `MEMBER` | `shayam@memoryverse.com` | `password123` |
| **Narasimha** | `MEMBER` | `narasimha@memoryverse.com` | `password123` |
| **Raju** | `MEMBER` | `raju@memoryverse.com` | `password123` |
| **Yugandar** | `MEMBER` | `yugandar@memoryverse.com` | `password123` |
| **Hemanth** | `MEMBER` | `hemanth@memoryverse.com` | `password123` |

---

## 📡 REST API Reference

All protected endpoints require the HTTP header: `Authorization: Bearer <JWT_TOKEN>`.

### Authentication & Users
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `POST` | `/api/auth/register` | Public | Register a new member account |
| `GET` | `/api/users` | Member / Admin | List all members for tagging |
| `POST` | `/api/users/{id}/avatar` | Owner / Admin | Upload single profile avatar from device |

### Journeys & Sections
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/journeys` | Member / Admin | Retrieve all journeys with chapters and stats |
| `GET` | `/api/journeys/{id}` | Member / Admin | Retrieve single journey narrative |
| `POST` | `/api/journeys` | Member / Admin | Create a new journey |
| `PUT` | `/api/journeys/{id}` | Creator / Admin | Update journey details and cover image |
| `POST` | `/api/journeys/{id}/sections`| Creator / Admin | Add a new chapter to a journey |

### Memories & Media
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/memories` | Member / Admin | Paginated list of memories with filtering |
| `GET` | `/api/memories/{id}` | Member / Admin | Retrieve memory story, media assets, and tags |
| `POST` | `/api/memories` | Member / Admin | Create a new memory with media files |
| `PUT` | `/api/memories/{id}` | Creator / Admin | Update memory story, date, and location |
| `POST` | `/api/memories/{id}/media` | Creator / Admin | Append multiple photos/videos to existing memory |
| `POST` | `/api/memories/{id}/favorite` | Member / Admin | Toggle memory favorite bookmark |
| `GET` | `/api/memories/on-this-day` | Member / Admin | Fetch nostalgia memories from this day in past years |
| `POST` | `/api/media/upload` | Member / Admin | Upload single file (cover image, avatar) |

### Places & Geospatial
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/places` | Member / Admin | Retrieve all distinct locations with memory counts |
| `GET` | `/api/places/locations` | Member / Admin | Retrieve geographic coordinates for map pins |

### Comments & Reactions
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/memories/{id}/comments` | Member / Admin | Retrieve reminiscing margin comments |
| `POST` | `/api/memories/{id}/comments` | Member / Admin | Add a new comment to a memory |
| `POST` | `/api/memories/{id}/reactions`| Member / Admin | Add or toggle an emoji reaction |

### Collections & Favorites
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/collections` | Member / Admin | List user curated collections |
| `POST` | `/api/collections` | Member / Admin | Create a new memory collection |
| `POST` | `/api/collections/{id}/memories/{memoryId}` | Member / Admin | Add a memory to a collection |
| `GET` | `/api/favorites` | Member / Admin | List all favorited memories |

### Keepsake Exports & Sharing
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/export/memory/{id}/zip` | Member / Admin | Download ZIP archive of a single memory |
| `GET` | `/api/export/journey/{id}/zip` | Member / Admin | Download ZIP archive of an entire journey |
| `GET` | `/api/export/memory/{id}/book` | Member / Admin | Open standalone HTML Keepsake Book for a memory |
| `GET` | `/api/export/journey/{id}/book` | Member / Admin | Open standalone HTML Keepsake Book for a journey |
| `POST` | `/api/shared-links` | Member / Admin | Create an expiring tokenized share link |
| `GET` | `/api/public/s/{token}` | Public | Access shared memory/journey via token |

### Trash & Soft Deletion
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trash` | Member / Admin | View all soft-deleted items |
| `POST` | `/api/trash/{id}/restore` | Creator / Admin | Restore a memory from trash |
| `DELETE` | `/api/trash/{id}/permanent` | Creator / Admin | Permanently delete a memory |

### AI Memory Assistant
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/chat` | Member / Admin | Query AI assistant with context & model selection |
| `GET` | `/api/ai/conversations` | Member / Admin | List active user AI conversation threads |
| `GET` | `/api/ai/conversations/{id}/messages` | Member / Admin | Retrieve conversation message history |

---

## ☁️ Free-Tier Cloud Deployment Guide

MemoryVerse is designed to be easily deployed on generous free-tier cloud platforms:

### 1. Database — Neon (Serverless PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech) and create a new project `memory-verse`.
2. Copy the pooled connection string (`postgresql://user:password@ep-...pooler.neon.tech/memoryverse?sslmode=require`).
3. Set JDBC URL in backend: `jdbc:postgresql://ep-...pooler.neon.tech/memoryverse?sslmode=require`.

### 2. Media Storage — Cloudinary
1. Sign up at [cloudinary.com](https://cloudinary.com) (Free 25GB storage/bandwidth).
2. Retrieve `cloud_name`, `api_key`, and `api_secret` from the Dashboard.
3. Configure these environment variables in your backend hosting service.

### 3. Backend Hosting — Render / Railway
1. Create a new **Web Service** on [render.com](https://render.com) connected to your GitHub repository.
2. Root Directory: `backend`
3. Build Command: `./mvnw clean package -DskipTests`
4. Start Command: `java -Dspring.profiles.active=prod -jar target/memory-verse-backend-0.0.1-SNAPSHOT.jar`
5. Configure Environment Variables:
   * `SPRING_PROFILES_ACTIVE`: `prod`
   * `SPRING_DATASOURCE_URL`: `<Your Neon JDBC URL>`
   * `SPRING_DATASOURCE_USERNAME`: `<Neon User>`
   * `SPRING_DATASOURCE_PASSWORD`: `<Neon Password>`
   * `JWT_SECRET`: `<Secure 256-bit random hex string>`
   * `CLOUDINARY_CLOUD_NAME`: `<Your Cloudinary Cloud Name>`
   * `CLOUDINARY_API_KEY`: `<Your Cloudinary API Key>`
   * `CLOUDINARY_API_SECRET`: `<Your Cloudinary API Secret>`
   * `NVIDIA_NIM_API_KEY`: `<Your NVIDIA NIM Key>`
   * `CORS_ALLOWED_ORIGINS`: `https://your-app.vercel.app`

### 4. Frontend Hosting — Vercel / Netlify
1. Connect your repository to [vercel.com](https://vercel.com) or [netlify.com](https://netlify.com).
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist/memory-verse/browser` (or `dist/memory-verse`)
5. SPA Routing: Automatically handled by the included `vercel.json` and `netlify.toml`.

---

## 🛡️ Security & Production Hardening

* **Sanitized SLF4J Logging**: API keys (`NVIDIA_API_KEY`, `JWT_SECRET`), passwords, and private user conversation payloads are **strictly masked** from application logs.
* **Payload Size Limits**: Spring Boot multipart request limits are enforced (up to 100MB for video/voice/audio archives). Oversized uploads are intercepted by `GlobalExceptionHandler` returning structured `413 Payload Too Large` responses.
* **Role-Based Access Control**: Sensitive mutations (`PUT /api/journeys/{id}`, `PUT /api/memories/{id}`, `DELETE /api/trash/{id}/permanent`) verify that the caller is either the **original author** or holds **`ROLE_ADMIN`** authority.
* **Resilient Infrastructure Fallbacks**: If Redis or Cloudinary are unreachable, the platform automatically falls back to PostgreSQL direct queries and local disk media storage without interruption.

---

<div align="center">

Crafted with care for preserving memories that matter.  
**MemoryVerse — Relive Every Chapter.**

</div>

