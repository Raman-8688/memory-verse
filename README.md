# 📖 MemoryVerse — Private Nostalgia & Digital Memory Archive

<div align="center">

![Java 21](https://img.shields.io/badge/Java-21_LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Spring AI](https://img.shields.io/badge/Spring_AI-1.0.0--M4-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-18_Standalone-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-Llama_3.1_70B-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
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
7. [Getting Started & Local Setup](#-getting-started--local-setup)
8. [Default Seed Accounts](#-default-seed-accounts)
9. [REST API Reference](#-rest-api-reference)
10. [Security & Production Hardening](#-security--production-hardening)

---

## 🌟 Overview & Philosophy

Unlike algorithmic social networks or unstructured cloud drives, **MemoryVerse** treats group memories not as isolated media files or database rows, but as **living chapters of a shared human journey**.

### Core Highlights:
* 🏛️ **Chronological Journeys & Chapters**: Organize moments into life chapters (e.g., *College Days*, *Road Trips*, *Reunions*) with milestones and member tagging.
* 📸 **Direct Device Media Uploads (No Manual URLs!)**: Pick photos and videos directly from mobile camera, device gallery, or computer with instant client-side previews.
* 🧠 **AI Memory Intelligence (NVIDIA NIM & Spring AI)**: Ask questions in plain English (*"Show photos of farewell in 2024"*, *"Who was with me in Goa?"*). Uses type-safe JPA Criteria Specifications to query PostgreSQL without LLM hallucinations.
* 📱 **Progressive Web App (PWA)**: Installable on iOS and Android with full-screen native feel, mobile quick capture sheet, and hardware camera bridging (`capture="environment"`).
* 🎨 **Warm Editorial Design System**: Tailored with a warm stone palette (`#fcfbf9`), amber/cognac (`#b45309`), espresso accents (`#78350f`), and classic Cormorant Garamond display typography.
* 🛡️ **Zero Broken Images**: Custom Angular `mvFallback` directive automatically catches broken/missing media links and renders on-brand SVG placeholders.

---

## ⚡ Key Capabilities & Features

```
                               ┌────────────────────────┐
                               │   MemoryVerse Core     │
                               └───────────┬────────────┘
         ┌──────────────────┬──────────────┴─────────────┬──────────────────┐
         ▼                  ▼                            ▼                  ▼
┌─────────────────┐ ┌───────────────┐           ┌─────────────────┐ ┌─────────────────┐
│    Journeys     │ │  AI Assistant │           │  Smart Capture  │ │ Fullscreen View │
│   & Chapters    │ │   Dual-Mode   │           │    & Review     │ │    & Gallery    │
└─────────────────┘ └───────────────┘           └─────────────────┘ └─────────────────┘
```

### 1. Chronological Journeys & In-Place Editing
* **Journeys & Chapters**: Memories belong to distinct journeys (e.g., *"B.Tech College Days 2020-2024"*) broken into chronological sections (e.g., *"First Year — Beginnings"*, *"Campus Life & Coding"*).
* **Direct Cover Upload**: Click to select a cover image directly from your phone/PC. Shows an instant high-resolution preview with "Change Photo" and "Remove" actions.
* **Silent State Updates**: Editing journeys or memories updates Angular Signals silently in-place without page reloads.

### 2. Dual-Mode AI Memory Assistant
Powered by **Spring AI** and the **NVIDIA NIM API** (`meta/llama-3.1-70b-instruct`):
* **Mode A — Grounded Memory Search**:
  1. Translates natural queries into structured `MemorySearchCriteria` (dates, keywords, locations, tagged users).
  2. Dynamically queries PostgreSQL using type-safe **JPA Criteria Specifications**.
  3. **Zero-Hallucination Guardrail**: If no memories match the search criteria, the assistant immediately returns a warm response *without querying the LLM*, eliminating false information.
  4. Renders responsive inline memory cards, location pills, and media grids in the chat feed.
* **Mode B — General Conversational Companion**: Friendly nostalgic discussion about college days, advice, and stories.
* **Rolling Window Context**: Tracks conversation history in PostgreSQL (`AiConversation` & `AiMessage`) using a 6-message rolling window to resolve pronouns (*"Who was there with us?"*) while conserving tokens.
* **Multi-Model Fallback & UI Model Selector**: Primary `llama-3.1-70b-instruct` with automatic fallbacks to `llama-3.1-8b`, `mistral-7b-instruct-v0.2`, and `gemma-2-27b-it`. Switch models dynamically in the UI.

### 3. Smart Media Capture & PWA
* **PWA Standalone Shell**: Configured via `manifest.webmanifest` for mobile home screen installation.
* **Mobile Quick Capture Sheet**: Touch-optimized bottom sheet with native actions:
  * 📷 **Take Photo**: `<input type="file" accept="image/*" capture="environment">`
  * 🎥 **Record Video**: `<input type="file" accept="video/*" capture="environment">`
  * 🖼️ **Device Gallery**: Multiple photo/video selection (`multiple`).
* **Desktop Drag & Drop**: Batch dropzone for dragging multiple files directly into the review screen.
* **Review Screen (`/capture/review`)**: Instant client-side `URL.createObjectURL()` previews, remove individual assets, select journey & chapter metadata, and monitor progress bars.

### 4. Single-Image Profile Avatar Update
* Tap the camera badge on your profile picture to select a single avatar photo from your device.
* Uploads to the backend and immediately updates the avatar across the entire application (navbar, dashboard, profile, and chat) via Angular Signals.

### 5. Media Gallery & Fullscreen Obsidian Lightbox
* Masonry grid with filter tabs for **All Moments**, **Photographs**, and **Videos**.
* Fullscreen lightbox (`MediaViewerModalComponent`) supporting zoom, keyboard navigation (left/right arrow keys, Escape), and direct downloads.

### 6. Activity & Notifications Center
* Real-time notifications when batchmates tag you in newly uploaded memories.
* Optimistic unread badge count updates.

---

## 🏗️ Architecture & Tech Stack

MemoryVerse is designed as an enterprise **Modular Monolith** for low operational overhead and high velocity:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MEMORYVERSE ARCHITECTURE                                       │
├────────────────────────┬────────────────────────────────────────┬────────────────────────────────┤
│    CLIENT INTERFACE    │           APPLICATION TIER             │          STORAGE TIER          │
├────────────────────────┼────────────────────────────────────────┼────────────────────────────────┤
│ • Angular 18 Standalone│ • Spring Boot 3.3.4 (Java 21 LTS)      │ • PostgreSQL 16                │
│ • Progressive Web App  │ • Spring AI 1.0.0-M4                   │   (Relational Schema & Dynamic │
│ • Angular Material 18  │ • Spring Security 6 (Stateless JWT)    │    JPA Specifications)         │
│ • Signals State Store  │ • NVIDIA NIM Multi-Model Client        │ • Redis 7                      │
│ • HTML5 Native Camera  │ • Hibernate 6.5 / Criteria API         │   (Caching with Fail-Safe Fall-│
│ • Fullscreen Lightbox  │ • Resilient Global Exception Handler   │    back)                       │
│ • Image Fallback (SVG) │ • Cloudinary SDK (Dual Storage Mode)   │ • Cloudinary / Local Storage   │
└────────────────────────┴────────────────────────────────────────┴────────────────────────────────┘
```

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend Framework** | **Spring Boot 3.3.4** | Java 21 LTS, Virtual Threads ready, Modular Packages |
| **AI Framework** | **Spring AI 1.0.0-M4** | Structured output parsing (`BeanOutputConverter`), Prompt Templates |
| **LLM Provider** | **NVIDIA NIM API** | Meta Llama 3.1 70B / 8B, Mistral 7B, Gemma 2 |
| **Database** | **PostgreSQL 16** | Relational schema, UUID primary keys, dynamic Criteria queries |
| **Cache Layer** | **Redis 7** | Cache-aside pattern with automatic fail-safe database fallback |
| **Media Storage** | **Cloudinary + Local** | Cloud storage with automatic local disk fallback (`uploads/media`) |
| **Frontend Framework** | **Angular 18** | 100% Standalone Components, Signal-based reactivity, No NgModules |
| **UI Components** | **Angular Material 18** | Custom theme, typography tokens, responsive layouts |
| **Mobile** | **PWA + HTML5** | Standalone manifest, Touch Bottom Sheet, Hardware Camera Bridging |

---

## 📂 Project Directory Structure

```
memory-verse/
├── docker-compose.yml              # Local PostgreSQL 16 & Redis 7 containers
├── seed_raw_data.sql               # Complete SQL database seed script
├── PROJECT_DOCUMENTATION.md        # Comprehensive technical specifications
├── README.md                       # Main repository overview & guide
├── users&admins_details/           # User avatar photographs & reference accounts
│
├── backend/                        # Spring Boot 3.3.4 Application (Java 21)
│   ├── pom.xml                     # Maven dependencies (Spring AI, Security, Redis, Cloudinary)
│   └── src/main/
│       ├── java/com/memoryverse/
│       │   ├── common/             # Global error handling, API response wrapper, JWT utils
│       │   │   ├── api/            # ApiResponse<T>, PageResponse<T>
│       │   │   ├── exception/      # GlobalExceptionHandler, Custom Exceptions
│       │   │   ├── security/       # JwtAuthFilter, JwtTokenProvider, SecurityConfig
│       │   │   └── util/           # SecurityUtils
│       │   ├── config/             # AppConfig, CacheConfig, DataInitializer (Seeder)
│       │   └── modules/            # Domain-driven feature modules
│       │       ├── ai/             # AI Memory Assistant Module
│       │       │   ├── client/     # NvidiaNimClient, ModelProvider
│       │       │   ├── dto/        # ChatRequest, ChatResponse, MemorySearchCriteria
│       │       │   ├── entity/     # AiConversation, AiMessage
│       │       │   ├── repository/ # AiConversationRepository, AiMessageRepository
│       │       │   ├── retrieval/  # MemoryRetrievalService (JPA Criteria Builder)
│       │       │   └── service/    # AiOrchestratorService (Intent routing & LLM synthesis)
│       │       ├── auth/           # Login, Register, AuthenticationController
│       │       ├── dashboard/      # DashboardController, AggregationService, Milestone DTOs
│       │       ├── gallery/        # GalleryController, Media filtering & search
│       │       ├── journey/        # JourneyController, JourneyService, Journey, Section
│       │       ├── media/          # MediaController (Direct Upload & Streaming), CloudinaryService
│       │       ├── memory/         # MemoryController, MemoryService, MemorySpecification
│       │       ├── notification/   # NotificationController, NotificationService, Entity
│       │       └── user/           # UserController, UserService, User Entity, Role enum
│       └── resources/
│           ├── application.yml     # Spring application configuration
│           └── application-secrets.yml # Git-ignored local secrets (DB pass, API keys)
│
└── frontend/                       # Angular 18 Standalone Web & PWA Application
    ├── angular.json                # Angular build & assets configuration
    ├── package.json                # Dependencies (@angular/material, rxjs, etc.)
    └── src/
        ├── manifest.webmanifest    # PWA installable manifest
        ├── styles.scss             # Design system tokens (stone, amber, espresso, typography)
        └── app/
            ├── core/               # Singletons, auth guards, interceptors, models
            │   ├── auth/           # AuthService (Signals), AuthGuard, RoleGuard
            │   ├── interceptors/   # AuthInterceptor (JWT Bearer token attachment)
            │   ├── models/         # TypeScript interfaces (Journey, Memory, Media, User)
            │   └── services/       # ApiService, JourneyService, MemoryService, MediaService
            ├── features/           # Feature pages & components
            │   ├── admin/          # Admin management settings
            │   ├── assistant/      # AI Assistant chat feed, message cards, model selector
            │   ├── auth/           # Login & Registration views
            │   ├── capture/        # Quick Capture Bottom Sheet, Quick Add Review screen
            │   ├── dashboard/      # Editorial masthead, Memory of the Day, Timeline ribbon
            │   ├── gallery/        # Masonry photo & video gallery
            │   ├── journeys/       # Journey list, journey detail, and JourneyEditDialog
            │   ├── memories/       # Memory feed, Memory detail, MemoryEditDialog, Stepper
            │   └── profile/        # User profile, single-avatar upload, tagged moments
            └── shared/             # Reusable UI components & directives
                ├── components/     # Header navbar, mobile bottom navigation, lightbox modal
                └── directives/     # ImageFallbackDirective (mvFallback)
```

---

## 🖥️ Frontend Architecture

The frontend is built with **Angular 18** using **100% Standalone Components** and **Signals** for reactive state:

* **Signal State Management**: Core state (`currentUser`, `token`, active conversation, upload progress) is driven by Angular Signals (`signal`, `computed`) rather than complex external state libraries.
* **Direct Media Selection**: Forms use native `<input type="file">` elements connected to `URL.createObjectURL()` for immediate zero-latency previews before uploading to the server.
* **Resilient Image Fallback (`mvFallback`)**: The custom standalone directive `ImageFallbackDirective` listens to `(error)` events on `<img>` tags, cleanly replacing broken links with an SVG placeholder.
* **Responsive Editorial Layout**: Mobile bottom navigation for phones, full sticky header for desktop, and flexible CSS grid/flexbox layouts adhering to an 8px spacing rhythm.

---

## ⚙️ Backend Architecture

The backend is built with **Spring Boot 3.3.4** and **Java 21 LTS**:

* **Modular Package Isolation**: Every module (`journey`, `memory`, `ai`, `media`, `user`) encapsulates its own Controller, Service, Repository, DTOs, and Entities.
* **Zero-Hallucination AI Pipeline**:
  ```
  User Query ──> Intent Classifier ──> [MEMORY SEARCH] ──> JPA Criteria Spec ──> PostgreSQL
                                                                     │
                                                       Memories Found?
                                                      /               \
                                                  [YES]               [NO]
                                                   /                     \
                             Context Injected into NVIDIA NIM     Friendly Short-Circuit Message
                                   (Llama 3.1 70B)                  (No LLM Hallucinations!)
  ```
* **Dual Storage Strategy**: Files uploaded to `POST /api/media/upload` or `POST /api/memories/{id}/media` upload to Cloudinary. If Cloudinary credentials are empty, it automatically writes to local disk storage (`uploads/media/`).
* **Fail-Safe Caching**: Redis caches dashboard and journey queries. If Redis goes down, `CacheConfig` catches the failure and transparently routes queries to PostgreSQL without throwing 500 errors.

---

## 🚀 Getting Started & Local Setup

Get MemoryVerse running locally from scratch in **under 10 minutes**.

### 1. Prerequisites Checklist
* **Java**: JDK 21 LTS ([Eclipse Temurin 21](https://adoptium.net/))
* **Node.js**: v18.19+ or v20+ ([Node.js Downloads](https://nodejs.org/))
* **Angular CLI**: `npm install -g @angular/cli`
* **Docker & Docker Compose** (or local PostgreSQL 16 & Redis 7)
* **Maven**: 3.9+ (or use the included `./mvnw`)

---

### 2. Clone the Repository
```bash
git clone https://github.com/Raman-8688/memory-verse.git
cd memory-verse
```

---

### 3. Start Database & Redis (Docker)
From the repository root:
```bash
docker-compose up -d
```
*This starts PostgreSQL on port `5432` (db: `memoryverse`, user: `postgres`, pass: `password`) and Redis on port `6379`.*

> **Alternative (Local PostgreSQL)**: If you are not using Docker, create a database named `memoryverse` in your local PostgreSQL server.

---

### 4. Configure Backend Secrets (CRITICAL)
Sensitive keys are git-ignored. Create your local secrets configuration:

1. Navigate to: `backend/src/main/resources/`
2. Create a file named **`application-secrets.yml`**
3. Paste the following template:

```yaml
# ==============================================================================
# MEMORYVERSE LOCAL APPLICATION SECRETS (Excluded from Git Tracking)
# ==============================================================================

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/memoryverse
    username: postgres
    password: password
  data:
    redis:
      host: localhost
      port: 6379

app:
  jwt:
    # 256-bit Base64-encoded secret key
    secret: 404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
    expiration-ms: 86400000 # 24 Hours

# Cloudinary CDN (Leave empty to use automatic local disk storage)
cloudinary:
  cloud-name: ""
  api-key: ""
  api-secret: ""

# NVIDIA NIM API (For AI Memory Assistant)
# Get a free key at https://build.nvidia.com/
nvidia:
  nim:
    api-key: "YOUR_NVIDIA_NIM_API_KEY"
    base-url: "https://integrate.api.nvidia.com/v1"
    model: "meta/llama-3.1-70b-instruct"
```

---

### 5. Run the Backend
```bash
cd backend
./mvnw spring-boot:run
```
*(On Windows PowerShell, use `.\mvnw.cmd spring-boot:run`)*

The backend will start at **`http://localhost:8080`**.  
On first startup, `DataInitializer` will automatically seed default accounts, journeys, chapters, and nostalgia milestones.

---

### 6. Run the Frontend
In a new terminal window:
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
| `POST` | `/api/auth/register` | Public | Register a new group member |
| `GET` | `/api/users` | Member / Admin | List all members for tagging |
| `POST` | `/api/users/{id}/avatar` | Owner / Admin | Upload single profile avatar from device |

### Journeys & Sections
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/journeys` | Member / Admin | Retrieve all journeys with chapters and stats |
| `GET` | `/api/journeys/{id}` | Member / Admin | Retrieve single journey narrative |
| `POST` | `/api/journeys` | Member / Admin | Create a new journey |
| `PUT` | `/api/journeys/{id}` | Creator / Admin | Update journey details, dates, and cover image |
| `POST` | `/api/journeys/{id}/sections`| Creator / Admin | Add a new chapter to a journey |

### Memories & Media
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/memories` | Member / Admin | Paginated list of memories with filtering |
| `GET` | `/api/memories/{id}` | Member / Admin | Retrieve memory story, media assets, and tags |
| `POST` | `/api/memories` | Member / Admin | Create a new memory with media files |
| `PUT` | `/api/memories/{id}` | Creator / Admin | Update memory story, date, and location |
| `POST` | `/api/memories/{id}/media` | Creator / Admin | Append multiple photos/videos to existing memory |
| `POST` | `/api/media/upload` | Member / Admin | Upload single file (cover image, avatar) |

### AI Memory Assistant
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/chat` | Member / Admin | Query AI assistant with context & model selection |
| `GET` | `/api/ai/conversations` | Member / Admin | List active user AI conversation threads |
| `GET` | `/api/ai/conversations/{id}/messages` | Member / Admin | Retrieve conversation message history |

---

## 🛡️ Security & Production Hardening

* **Sanitized SLF4J Logging**: API keys (`NVIDIA_API_KEY`), passwords, JWT tokens, and private user conversation payloads are **strictly masked** from application log outputs.
* **Payload Size Limits**: Spring Boot multipart max request limits are enforced (`spring.servlet.multipart.max-file-size=50MB`). Oversized uploads are intercepted by `GlobalExceptionHandler` and return structured `413 Payload Too Large` responses.
* **Role-Based Access Control**: Sensitive mutations (`PUT /api/journeys/{id}`, `PUT /api/memories/{id}`, `POST /api/memories/{id}/media`) verify that the caller is either the **original creator** or holds the **`ROLE_ADMIN`** authority.
* **Safe Fallbacks**: If Redis or Cloudinary are unreachable, the platform automatically switches to PostgreSQL direct queries and local disk media storage.

---

<div align="center">

Crafted with care for preserving memories that matter.  
**MemoryVerse — Relive Every Chapter.**

</div>
