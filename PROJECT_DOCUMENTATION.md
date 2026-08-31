# MemoryVerse — Master System Documentation & Developer Guide

> **"The years pass and the roads diverge, but these moments remain frozen in light."**  
> *MemoryVerse is a private digital memory platform and nostalgia archive for friends and batchmates to preserve, organize, search, explore, and relive their shared journeys over many years.*

---

## 1. Project Overview

MemoryVerse was designed and built from the ground up as an **intimate, editorial digital memory journal**. Unlike noisy algorithmic social networks or disorganized cloud storage drives, MemoryVerse treats group memories not as arbitrary media files or database rows, but as **living chapters of a shared human journey**.

The platform is augmented with two enterprise-grade capabilities:
1. **AI Memory Intelligence Engine**: A natural language assistant powered by **Spring AI** and the **NVIDIA NIM API** (`meta/llama-3.1-70b-instruct`) with automated multi-model fallbacks, conversational history tracking, and strict type-safe JPA Criteria queries that completely eliminate LLM hallucinations.
2. **Smart Media Capture & PWA**: Seamless mobile-native camera capture (`<input type="file" capture="environment">`), desktop drag-and-drop dropzones, instant client-side preview rendering, and a resilient multipart upload pipeline with real-time progress indicators.

---

## 2. Architecture & Technology Stack

MemoryVerse follows a **Modular Monolith** architecture designed for low operational overhead, strict domain boundaries, and high developer velocity.

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
│ • Drag & Drop Dropzone │ • Cloudinary SDK (Dual Storage Mode)   │ • Cloudinary / Local Storage   │
└────────────────────────┴────────────────────────────────────────┴────────────────────────────────┘
```

### Technology Matrix

| Layer | Technology | Key Capabilities & Rationale |
| :--- | :--- | :--- |
| **Language & Runtime** | **Java 21 LTS** | Modern pattern matching, records, sealed types, and Virtual Thread readiness. |
| **Backend Framework** | **Spring Boot 3.3.4** | High-performance enterprise backend with modular package isolation. |
| **AI Intelligence** | **Spring AI 1.0.0-M4** | Structured output parsing (`BeanOutputConverter`), prompt engineering, and model management. |
| **LLM Provider** | **NVIDIA NIM API** | Primary: `meta/llama-3.1-70b-instruct`; Fallbacks: `meta/llama-3.1-8b-instruct`, `mistralai/mistral-7b-instruct-v0.2`, `google/gemma-2-27b-it`. |
| **Primary Database** | **PostgreSQL 16** | Full relational integrity, UUID identifiers, indexed date/keywords, and future `pgvector` mapping. |
| **Caching Engine** | **Redis 7** | Cache layer with fail-safe error handling (database fallback if Redis is offline). |
| **Media Pipeline** | **Cloudinary + Local** | Cloud storage with auto-thumbnails; automatic graceful fallback to local disk storage if credentials are absent. |
| **Frontend Framework** | **Angular 18 Standalone** | Signal-based reactive state management, standalone components, no NgModule clutter. |
| **UI Design System** | **Angular Material + Custom CSS** | Warm editorial palette (`#fcfbf9` stone, `#b45309` amber/cognac, `#78350f` espresso), Cormorant Garamond display typography, 8px spacing. |
| **Mobile Experience** | **PWA + HTML5 Camera** | Standalone webmanifest, touch bottom sheet, native camera bridging (`capture="environment"`). |

---

## 3. Core Modules & Features

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

### 1. Journeys & Chronological Chapters
* **Living Narratives**: Memories are organized into overarching **Journeys** (e.g., *"B.Tech College Days"*, *"Goa Road Trip"*) and broken down into chronological **Sections / Chapters** (e.g., *"Freshman Year"*, *"Graduation Gala"*).
* **Deep Linking & Cover Artwork**: Custom cover images, start/end dates, milestone statistics, and member tagging.

### 2. AI Memory Assistant (Dual-Mode Intelligence)
* **Mode A — Grounded Memory Search**:
  1. Translates natural queries (e.g., *"Show photos of our farewell in 2024"*) into structured `MemorySearchCriteria`.
  2. Dynamically queries PostgreSQL using type-safe **JPA Criteria Specifications** (zero raw SQL).
  3. **No-Result Protection**: If no records match, immediately returns a friendly message *without querying the LLM* (eliminates hallucinations).
  4. If memories match, injects structured context into NVIDIA NIM for a grounded, nostalgic answer with inline memory cards and media grids.
* **Mode B — General AI Mode**: Conversational companion answering general questions with MemoryVerse warmth.
* **Rolling Window Context**: Tracks conversation history in PostgreSQL (`AiConversation` and `AiMessage`), enforcing a strict 6-message rolling window for pronoun resolution (e.g., *"Who was there?"*) without token bloat.

### 3. Smart Media Capture & Quick Add
* **PWA Standalone Shell**: Installable to iOS and Android home screens with full-screen native feel.
* **Native Camera Bridging**:
  * Photo: `<input type="file" accept="image/*" capture="environment">`
  * Video: `<input type="file" accept="video/*" capture="environment">`
  * Gallery: `<input type="file" accept="image/*,video/*" multiple>`
* **Desktop Drag & Drop Dropzone**: Polished dashed-border dropzone for batch selection.
* **Quick Add Review (`/capture/review`)**: Instant client-side `URL.createObjectURL()` previews, asset removal, journey/chapter selector, and real-time upload progress (`HttpEventType.UploadProgress`).

### 4. Media Gallery & Fullscreen Obsidian Lightbox
* Responsive masonry media grid with image/video format filtering and journey tags.
* High-resolution fullscreen lightbox (`MediaViewerModalComponent`) supporting zoom, keyboard navigation (arrow keys, Escape), and direct downloads.

### 5. Activity Center & Notifications
* Real-time notifications when batchmates tag you in newly uploaded memories.
* Unread badge counter with optimistic read status updates.

---

## 4. New System Setup Guide (How to Clone & Run)

Follow this step-by-step walkthrough to get a complete MemoryVerse development environment running from scratch in **under 10 minutes**.

### Prerequisites Checklist

Ensure the following tools are installed on your host machine:

| Tool | Minimum Version | Installation Command / Link |
| :--- | :--- | :--- |
| **Java Development Kit (JDK)** | **21 LTS** | [Eclipse Temurin 21](https://adoptium.net/) or `winget install EclipseAdoptium.Temurin.21.JDK` |
| **Apache Maven** | **3.9+** | Included via `./mvnw` or `winget install Apache.Maven` |
| **Node.js & npm** | **Node 18.19+ or 20+** | [Nodejs.org](https://nodejs.org/) or `winget install OpenJS.NodeJS.LTS` |
| **Angular CLI** | **18.x** | `npm install -g @angular/cli` |
| **PostgreSQL** | **15+ or 16** | [PostgreSQL Downloads](https://www.postgresql.org/download/) |
| **Redis** *(Optional)* | **7.x** | [Redis Downloads](https://redis.io/download/) or Docker (`docker run -p 6379:6379 redis:7-alpine`) |

---

### Step 1: Database Setup

1. Open your PostgreSQL interactive terminal (`psql`) or a graphical client (e.g., pgAdmin, DBeaver):

```sql
-- Connect as postgres superuser
CREATE DATABASE memoryverse;
```

2. Confirm the database exists:
```sql
\l memoryverse
```

> **Note**: Spring Boot uses `ddl-auto: update`, so all 14 tables, indexes, and foreign keys will be automatically created upon first backend launch.

---

### Step 2: The Secrets Configuration File (CRITICAL)

For security, sensitive credentials (database passwords, JWT secret keys, Cloudinary tokens, and NVIDIA NIM API keys) are **strictly excluded from Git tracking via `.gitignore`**.

You must create your local secrets file before starting the backend:

1. Navigate to `backend/src/main/resources/`.
2. Create a new file named **`application-secrets.yml`**.
3. Copy the template below and supply your local values:

```yaml
# ==============================================================================
# MEMORYVERSE LOCAL APPLICATION SECRETS (Excluded from Git Tracking)
# Path: backend/src/main/resources/application-secrets.yml
# ==============================================================================

spring:
  # Database Credentials
  datasource:
    url: jdbc:postgresql://localhost:5432/memoryverse
    username: postgres
    password: your_postgres_password_here

  # AI Engine Configuration (NVIDIA NIM API)
  ai:
    openai:
      api-key: your_nvidia_nim_api_key_here
      base-url: https://integrate.api.nvidia.com/v1
      chat:
        options:
          model: meta/llama-3.1-70b-instruct
          temperature: 0.2
          max-tokens: 2048

# Application Security & Cloud Credentials
app:
  jwt:
    # Must be a 256-bit (minimum 32-character) secret key
    secret: 404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
    expiration-ms: 86400000 # 24 Hours

  cloudinary:
    # If leaving as placeholder, system automatically falls back to local disk uploads
    cloud-name: placeholder-cloud-name
    api-key: placeholder-api-key
    api-secret: placeholder-api-secret
```

> [!TIP]
> **Getting an NVIDIA API Key**: You can generate a free NVIDIA NIM API key at [build.nvidia.com](https://build.nvidia.com/). If no key is configured, the assistant provides graceful offline guidance.

> [!NOTE]
> **Cloudinary Fallback**: If you do not have a Cloudinary account, leave the `placeholder-cloud-name` value as-is. MemoryVerse will seamlessly store uploaded media files in the local directory `uploads/media/`.

---

### Step 3: Run the Backend (Spring Boot)

1. Open a terminal in the `backend/` directory:

```bash
cd backend
```

2. Compile and package the application:

```bash
mvn clean compile
```

3. Launch the Spring Boot server:

```bash
mvn spring-boot:run
```

4. Verify backend health:
   * Backend URL: `http://localhost:8080`
   * API Base Path: `http://localhost:8080/api`
   * Console output will confirm:
     ```
     Started MemoryVerseApplication in X.XXX seconds
     ```

---

### Step 4: Run the Frontend (Angular 18)

1. Open a second terminal in the `frontend/` directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the Angular development server:

```bash
npm start
# or: ng serve --open
```

4. Open your browser to:
   * **`http://localhost:4200`**

---

### Step 5: Initial Login & Seed Data

On the first application run, Spring Boot automatically seeds default test accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin User** | `admin@memoryverse.com` | `admin123` |
| **Member User** | `user@memoryverse.com` | `user123` |

1. Navigate to `http://localhost:4200/auth/login`.
2. Sign in with either of the accounts above.
3. You will land on the **Dashboard**, where you can immediately create journeys, snap photos with the camera, explore the media gallery, or chat with the AI Memory Assistant.

---

## 5. Testing & Verification

### Backend Verification
Run the backend test suite:
```bash
cd backend
mvn test
```

### Frontend Production Build Verification
Verify that the Angular ahead-of-time (AOT) bundle compiles with zero errors:
```bash
cd frontend
npm run build
```

The output will confirm bundle generation in `dist/memory-verse/` with all lazy chunks generated cleanly:
```
√ Building...
Application bundle generation complete.
0 Errors, 0 Warnings
```

---

## 6. Directory Structure Overview

```
memory-verse/
├── PROJECT_DOCUMENTATION.md          # Master System Documentation (This file)
├── .gitignore                         # Git exclusion rules (Includes secrets)
│
├── backend/                           # Spring Boot 3.3 Backend
│   ├── pom.xml                        # Maven configuration (Java 21, Spring AI BOM)
│   └── src/main/
│       ├── java/com/memoryverse/
│       │   ├── config/                # SecurityConfig, RedisConfig, CloudinaryConfig
│       │   ├── common/                # ApiError, ApiResponse, GlobalExceptionHandler
│       │   └── modules/
│       │       ├── ai/                # AI Orchestrator, NIM Provider, Grounded QA
│       │       │   ├── conversation/  # AiConversation & AiMessage (Context Store)
│       │       │   ├── dto/           # SearchCriteria, ChatRequest, ChatResponse
│       │       │   ├── prompt/        # Strict Grounded System Prompts
│       │       │   └── retrieval/     # JPA Memory Retrieval & Context Builders
│       │       ├── journey/           # Journey & JourneySection entities & services
│       │       ├── memory/            # Memory entity & dynamic JPA Specifications
│       │       ├── media/             # Media upload, Cloudinary & local storage
│       │       ├── notification/      # Activity alerts & notifications
│       │       └── user/              # User entity, JWT authentication & profile
│       └── resources/
│           ├── application.yml        # Base application configuration
│           ├── application-secrets.yml.example # Committed template
│           └── application-secrets.yml # Local credentials (GIT-IGNORED)
│
└── frontend/                          # Angular 18 Standalone Frontend
    ├── angular.json                   # Angular CLI configuration
    ├── package.json                   # NPM dependencies
    ├── public/
    │   └── manifest.webmanifest       # PWA Mobile manifest (#fcfbf9)
    └── src/
        ├── index.html                 # PWA meta tags and fonts
        ├── styles.scss                # Editorial design tokens & typography
        └── app/
            ├── app.routes.ts          # Application routing table (Lazy-loaded)
            ├── core/                  # AuthService, ApiService, Guards, Models
            ├── layout/                # Navbar, Sidebar, Mobile Bottom Nav
            ├── shared/                # MediaViewerModalComponent (Lightbox)
            └── features/
                ├── assistant/         # AI Assistant Chat Interface
                ├── capture/           # Quick Capture Sheet, Review & Dropzone
                ├── dashboard/         # Activity feed & milestone stats
                ├── gallery/           # Fullscreen masonry media gallery
                ├── journeys/          # Journey cards & chapter timelines
                ├── memories/          # Memory feed & creation wizard
                └── notifications/     # Notification center
```

---

## 7. Security & Production Checklist

- [x] **API Credentials Masked**: NVIDIA NIM API keys and JWT tokens are loaded strictly from git-ignored `application-secrets.yml` or environment variables.
- [x] **Zero Raw SQL**: All dynamic filtering uses JPA Criteria API Specifications, preventing SQL injection vulnerabilities.
- [x] **Sanitized Logging**: User passwords, bearer tokens, API keys, and sensitive chat messages are strictly suppressed from console and application logs.
- [x] **Payload Limit Guard**: Video uploads are constrained to 50MB MP4 format with Spring Boot `MaxUploadSizeExceededException` handled as HTTP 413.
- [x] **Hallucination Prevention**: Deterministic no-result short-circuit ensures the LLM is only queried when matching database records exist.
- [x] **Cache Resilience**: Transparent fallback ensures the system operates normally even if Redis is unreachable.
- [x] **Mobile PWA Optimization**: Native camera capture and touch-friendly layouts work seamlessly across mobile, tablet, and desktop viewports.

---

*MemoryVerse is designed and engineered for long-term nostalgia preservation.*
