<p align="center">
  <img src="mirae-logo.svg" alt="Mirae Logo" width="140" />
</p>

<h1 align="center">Mirae</h1>

<p align="center">
  <strong>AI-Powered Career Command Center</strong><br />
  <em>Save opportunities fast, understand them with AI, and track them in one calm workspace.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20+%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20+%20Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Microservice-Python%20FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Realtime-Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/ML-Scikit--Learn%20+%20Groq-FF6B35?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Extension-Chrome%20MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-team">Team</a>
</p>

---

## 📖 Overview

**Mirae** (미래 — Korean for *"future"*) is a full-stack opportunity tracking platform designed for students and professionals navigating their career search. It brings together a polished React dashboard, an intelligent Express + MongoDB backend, and a Chrome extension into one unified workspace.

Mirae doesn't just store your saved jobs — it **understands** them. Using Groq-powered AI (Llama 3.3 70B), every clipped opportunity is automatically analyzed, categorized, skill-matched against your resume, and scored for relevance. The result is a career command center that helps you stay organized, focused, and data-driven.

---

## ✨ Features

### 🖥️ Dashboard

| Capability | Description |
|---|---|
| **Multi-Category Tracking** | Track **Jobs**, **Hackathons/Contests**, and **Others** (workshops, webinars, fellowships, scholarships, etc.) in organized tabs |
| **Pipeline Management** | Jobs flow through `Saved → Applied / Interviewing → Offers → Rejected` stages |
| **Hackathon Tracking** | Separate `Saved` and `Registered` sections for hackathons and contests |
| **Dynamic Summary Bar** | Context-aware summary statistics that update based on the active tab |
| **Manual Entry** | Add opportunities manually with a structured form when not using the extension |
| **Card-Level Actions** | Delete records directly from the UI with instant MongoDB sync |

### 🤖 Autonomous Event-Driven Architecture

| Capability | Description |
|---|---|
| **Gmail Pub/Sub Webhooks** | Automatically ingests recruiter emails in real-time via Google Cloud Pub/Sub, eliminating the need for slow API polling |
| **Local ML Microservice** | A standalone Python FastAPI service running a custom Scikit-Learn TF-IDF model for classification, ensuring high performance and 100% data privacy (no sending emails to third-party LLMs) |
| **Real-time State Sync** | Uses Socket.io WebSockets to instantly push database mutations and new applications from the backend directly to the React dashboard without refreshing |
| **Background Cron Jobs** | Node-cron service autonomously scans the database to detect stale applications, provision calendar reminders, and manage your pipeline in the background |
| **Intelligent Extraction** | Automatically extracts title, company, location, salary, deadline, and description from raw page text or emails |
| **Skill Matching** | Compares required skills against your uploaded resume using a comprehensive 40+ skill library (Powered by Groq Llama 3) |

### 📊 Analytics & Insights

| Capability | Description |
|---|---|
| **Application Funnel** | Visual breakdown of your pipeline from Saved through to Offers |
| **Status Distribution** | Pie/bar charts showing where your applications currently stand |
| **Final Outcomes** | Track acceptance rates and rejection patterns |
| **Top Skills** | See which skills appear most across your tracked opportunities |
| **Summary Cards** | At-a-glance counts for saved, applied, rejected, and offer stages |

> **Note:** Analytics is currently scoped to **Jobs** only. Hackathons and Others do not affect analytics calculations.

### 📋 Detail Panels

- **Jobs** → Full `ApplicationDetail` drawer with skill analysis breakdown, match score, description, networking contacts, personal notes, and status controls
- **Hackathons & Others** → `OpportunityDetail` drawer with organizer, deadline, location, status, description, and source link

### 📅 Calendar

| Capability | Description |
|---|---|
| **Event Management** | Create, edit, and delete calendar events for interviews, deadlines, and follow-ups |
| **Dashboard Sync** | Automatically sync deadlines and important dates from tracked opportunities |
| **Event Types** | Support for `interview`, `deadline`, `follow-up`, and `other` event categories |
| **Status Tracking** | Mark events as `pending` or `completed` |

### 👤 Account & Profile

| Capability | Description |
|---|---|
| **JWT Authentication** | Secure registration and login with token-based auth |
| **Protected Routes** | Frontend route guards ensure authenticated access |
| **Profile Management** | Update name, email, and profile photo |
| **Password Management** | Change password with current password verification |
| **Resume Upload** | Upload PDF resumes with automatic text extraction via `pdf-parse` |
| **Social Portfolio** | Manage links to GitHub, LinkedIn, portfolio sites, and more |
| **Account Deletion** | Full account removal with data cleanup |

### ⚙️ Settings

| Capability | Description |
|---|---|
| **Notifications** | Configure follow-up reminders, deadline alerts, interview reminders, and browser notifications |
| **Notification Timing** | Choose `1 day`, `3 days`, or custom hours before events |
| **Appearance** | Toggle between `light` and `dark` themes with accent style and card layout preferences |
| **Privacy & Security** | Security activity alerts and profile discoverability controls |
| **Data Management** | Clear all application data or reset settings to defaults |
| **Danger Zone** | Account deletion and irreversible data operations with confirmation modals |

### 🧩 Chrome Extension

| Capability | Description |
|---|---|
| **One-Click Save** | Right-click → "Save to Mirae" context menu on any webpage |
| **Intelligent Scraping** | Content script extracts visible page text for AI analysis |
| **Token Sync** | Seamless authentication sync between the dashboard and extension |
| **Background Processing** | Service worker handles page clipping and backend communication |
| **Chrome MV3** | Built on Manifest V3 for modern Chrome compatibility |

---

## 🔄 How It Works

```text
┌──────────────┐     ┌──────────────┐
│  Recruiters  │────▶│    Gmail     │
│   (Emails)   │     │ (Pub/Sub)    │
└──────────────┘     └──────────────┘
                            │ (Webhooks)
                            ▼
┌─────────────────┐  ┌──────────────┐      ┌─────────────┐
│ Chrome Extension│─▶│ Node.js API  │◀────▶│ Python ML   │
│ (Page Scraper)  │  │ (Express)    │      │ Microservice│
└─────────────────┘  └──────────────┘      └─────────────┘
                            │                     │
                            │ (Socket.io)         ▼
                            │              ┌─────────────┐
                            ▼              │ Scikit-Learn│
┌─────────────────────────────────────┐    │ TF-IDF Model│
│       React Dashboard (Vite)        │    └─────────────┘
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Tracker │ │ Calendar│ │ Contacts│ │
│ └─────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────┘
```

### End-to-End Event Flow

1. **Passive Ingestion (Gmail):** A recruiter emails you. Google Cloud Pub/Sub detects the new message and fires a webhook to the Node.js backend.
2. **Active Ingestion (Extension):** You right-click a job posting and hit "Save to Mirae".
3. **ML Classification:** The Node.js backend forwards the raw text to the **Python FastAPI Microservice**.
4. **Data Extraction & Scoring:**
   - The custom **Scikit-Learn TF-IDF model** categorizes the opportunity (Job, Hackathon, Other) and infers the pipeline status (e.g., Offer, Rejected, Applied) with 98%+ accuracy.
   - **Groq Llama 3** extracts specific technical skills and computes a match score against your uploaded resume.
5. **Real-time UI Sync:** The enriched record is saved to MongoDB. The Node backend emits a **Socket.io** event, which instantly renders the new job/email on your React dashboard without you needing to refresh the page.
6. **Autonomous Reminders:** Every hour, a background **Cron Job** scans your pipeline. If it detects you haven't followed up with a recruiter in 7 days, it creates a reminder event in your Calendar.

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 18** | UI component library |
| **Vite** | Build tool and dev server |
| **TypeScript** | Type-safe development |
| **Tailwind CSS 4** | Utility-first styling |
| **Motion (Framer)** | Animations and transitions |
| **Recharts** | Analytics charts and visualizations |
| **Radix UI** | Accessible, unstyled UI primitives |
| **Lucide React** | Icon library |
| **React Router 7** | Client-side routing |
| **Sonner** | Toast notifications |
| **date-fns** | Date formatting and manipulation |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express 5** | Web framework and API routing |
| **Mongoose 9** | MongoDB ODM |
| **JWT** | Token-based authentication |
| **bcrypt** | Password hashing |
| **Multer** | File upload handling (resumes, photos) |
| **pdf-parse** | PDF text extraction for resumes |
| **Groq SDK** | AI inference via Llama 3.3 70B |

### Database & AI

| Technology | Purpose |
|---|---|
| **MongoDB Atlas** | Cloud-hosted document database |
| **Groq (Llama 3.3 70B)** | Fast AI extraction, classification, and skill matching |

### Extension

| Technology | Purpose |
|---|---|
| **Chrome MV3** | Extension platform |
| **Service Worker** | Background page clipping and API communication |
| **Content Script** | DOM text extraction |

---

## 📁 Project Structure

```text
Mirae/
├── src/                            # Frontend source
│   ├── main.tsx                    # App entry point
│   ├── app/
│   │   ├── App.tsx                 # Root component with routing
│   │   ├── components/
│   │   │   ├── LandingPage.tsx     # Public landing page
│   │   │   ├── Dashboard.tsx       # Main dashboard with tabs
│   │   │   ├── Analytics.tsx       # Analytics & insights view
│   │   │   ├── CalendarView.tsx    # Calendar event management
│   │   │   ├── Settings.tsx        # User settings panel
│   │   │   ├── ApplicationDetail.tsx   # Job detail side drawer
│   │   │   ├── OpportunityDetail.tsx   # Hackathon/Other detail drawer
│   │   │   ├── AddManualModal.tsx      # Manual opportunity entry
│   │   │   ├── ManageResumesModal.tsx  # Resume upload/management
│   │   │   ├── SocialPortfolioModal.tsx # Social links manager
│   │   │   ├── LoginModal.tsx          # Login form
│   │   │   ├── SignupModal.tsx         # Registration form
│   │   │   ├── LogoutConfirmModal.tsx  # Logout confirmation
│   │   │   ├── ProfilePopover.tsx      # Profile quick view
│   │   │   ├── ExtensionPopup.tsx      # Extension status UI
│   │   │   ├── ExtensionOnboardingModal.tsx
│   │   │   ├── BrandLogo.tsx           # Logo component
│   │   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   │   ├── ProtectedRoute.tsx      # Auth route guard
│   │   │   ├── ui/                     # Reusable UI primitives (shadcn)
│   │   │   └── figma/                  # Figma design components
│   │   ├── services/
│   │   │   ├── api.ts              # HTTP client with auth headers
│   │   │   ├── authService.ts      # Login/register/logout
│   │   │   ├── dashboardService.ts # Dashboard data fetching
│   │   │   ├── analyticsService.ts # Analytics data fetching
│   │   │   ├── trackerService.ts   # Opportunity CRUD
│   │   │   ├── profileService.ts   # Profile management
│   │   │   ├── calendarService.ts  # Calendar event management
│   │   │   ├── settingsService.ts  # Settings CRUD
│   │   │   └── googleCalendarService.ts
│   │   ├── types/
│   │   │   ├── job.ts              # Job/Opportunity types
│   │   │   ├── user.ts             # User types
│   │   │   └── calendar.ts         # Calendar event types
│   │   ├── hooks/
│   │   │   ├── useTheme.ts         # Theme management hook
│   │   │   ├── useNotificationScheduler.ts
│   │   │   └── useExtensionDetection.ts
│   │   └── contexts/
│   │       └── UserContext.tsx      # Global user state
│   └── styles/                     # Global CSS and theme tokens
│
├── Mirae-Backend/                  # Backend source
│   ├── server.js                   # Express app entry point
│   ├── config/
│   │   └── db.js                   # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js       # Register/login logic
│   │   ├── trackerController.js    # AI analysis + CRUD
│   │   ├── profileController.js    # Profile/resume/social links
│   │   ├── dashboardController.js  # Dashboard summaries
│   │   ├── analyticsController.js  # Analytics computations
│   │   ├── calendarController.js   # Calendar event CRUD
│   │   ├── settingsController.js   # User settings CRUD
│   │   └── googleCalendarController.js
│   ├── middlewares/
│   │   └── authMiddleware.js       # JWT verification
│   ├── models/
│   │   ├── User.js                 # User schema
│   │   ├── Job.js                  # Opportunity schema
│   │   ├── CalendarEvent.js        # Calendar event schema
│   │   └── Settings.js             # Settings schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── trackerRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── calendarRoutes.js
│   │   ├── settingsRoutes.js
│   │   └── jobRoutes.js
│   └── utils/
│       └── generateToken.js        # JWT token generator
│
├── Mirae-Extension/                # Chrome extension
│   ├── manifest.json               # MV3 manifest
│   ├── background.js               # Service worker
│   ├── content.js                  # Content script (scraper)
│   ├── popup.html                  # Extension popup UI
│   └── popup.js                    # Popup logic
│
├── package.json
├── vite.config.ts
├── index.html
└── README.md
```

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Protected routes require a valid `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Login and receive JWT | Public |

### Tracker (Opportunities)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/tracker` | Create a new tracked opportunity (AI-analyzed) | 🔒 |
| `GET` | `/api/tracker` | Get all tracked opportunities for the user | 🔒 |
| `DELETE` | `/api/tracker/:id` | Delete a tracked opportunity | 🔒 |
| `PUT` | `/api/tracker/:id/status` | Update opportunity pipeline status | 🔒 |
| `PUT` | `/api/tracker/:id/contacts` | Save networking contacts for an opportunity | 🔒 |
| `PUT` | `/api/tracker/:id/notes` | Save personal notes for an opportunity | 🔒 |

### Profile

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/profile` | Get current user profile | 🔒 |
| `PUT` | `/api/profile/update` | Update name and email | 🔒 |
| `PUT` | `/api/profile/change-password` | Change password | 🔒 |
| `POST` | `/api/profile/upload-photo` | Upload profile photo | 🔒 |
| `DELETE` | `/api/profile/delete` | Delete user account | 🔒 |
| `PUT` | `/api/profile/resume` | Update resume text | 🔒 |
| `POST` | `/api/profile/resume/upload` | Upload PDF resume (auto text extraction) | 🔒 |
| `DELETE` | `/api/profile/resume` | Delete uploaded resume | 🔒 |
| `PUT` | `/api/profile/social-links` | Update social portfolio links | 🔒 |

### Dashboard

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Get dashboard summary statistics | 🔒 |
| `GET` | `/api/dashboard/recent` | Get recently tracked opportunities | 🔒 |

### Analytics

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | Get analytics overview (saved/applied/rejected/offers) | 🔒 |
| `GET` | `/api/analytics/status-breakdown` | Get status distribution breakdown | 🔒 |
| `GET` | `/api/analytics/trends` | Get application trends over time | 🔒 |

### Calendar

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/calendar` | Get all calendar events | 🔒 |
| `GET` | `/api/calendar/:id` | Get a specific event | 🔒 |
| `POST` | `/api/calendar` | Create a new calendar event | 🔒 |
| `PUT` | `/api/calendar/:id` | Update a calendar event | 🔒 |
| `DELETE` | `/api/calendar/:id` | Delete a calendar event | 🔒 |
| `POST` | `/api/calendar/sync-dashboard-reminders` | Sync deadlines from tracked opportunities | 🔒 |

### Settings

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/settings` | Get user settings | 🔒 |
| `PUT` | `/api/settings` | Update user settings | 🔒 |
| `POST` | `/api/settings/reset` | Reset settings to defaults | 🔒 |
| `POST` | `/api/settings/clear-data` | Clear all application data | 🔒 |

### Health Check

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Backend health status | Public |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB Atlas** account (or local MongoDB instance)
- **Groq API Key** — [Get one free at console.groq.com](https://console.groq.com)
- **Google Chrome** (for the extension)

### 1. Clone the Repository

```bash
git clone https://github.com/vennelajangiti17/Mirae.git
cd Mirae
```

### 2. Set Up Environment Variables

Create a `.env` file inside the `Mirae-Backend/` directory:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret
GROQ_API_KEY=your_groq_api_key
PORT=5000
```

> **Important:** The `GROQ_API_KEY` is required for the AI-powered tracker analysis pipeline. Without it, saved opportunities will fall back to URL-based metadata only.

### 3. Install Dependencies & Set up ML Service

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd Mirae-Backend
npm install
cd ..

# Python ML Microservice
cd Mirae-Classifier
python -m venv venv
.\venv\Scripts\activate   # On Windows
# source venv/bin/activate # On Mac/Linux
pip install -r requirements.txt
cd ..
```

### 4. Start the Node.js Backend Server

```bash
cd Mirae-Backend
node server.js
```

The backend will start on `http://localhost:5000`. You can verify with:

```bash
curl http://localhost:5000/health
# → {"message":"Mirae Backend is running perfectly! 🚀"}
```

### 5. Start the Python ML Microservice

Open a new terminal window:
```bash
cd Mirae-Classifier
.\venv\Scripts\activate   # On Windows
uvicorn main:app --host 0.0.0.0 --port 8000
```

The ML classification service will start on `http://localhost:8000`.

### 6. Start the Frontend Dev Server

```bash
# From the project root
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 7. Load the Chrome Extension

1. Open `chrome://extensions` in Google Chrome
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `Mirae-Extension/` directory
5. Log into the Mirae dashboard — the JWT token will automatically sync to the extension

---

## 🧪 Usage Guide

### Saving an Opportunity via Extension

1. Navigate to any job posting, hackathon page, or opportunity listing
2. Right-click anywhere on the page
3. Select **"Save to Mirae"** from the context menu
4. The page will be analyzed by AI and appear in your dashboard within seconds

### Manual Entry

1. Click the **"+ Add"** button on the dashboard
2. Fill in the opportunity details (title, company, category, etc.)
3. The entry will be saved to your account

### Tracking Your Pipeline

- Use the **dashboard tabs** to switch between Jobs, Hackathons, and Others
- Click any card to open the **detail drawer** for full information
- Update pipeline status, add notes, and save networking contacts
- Visit **Analytics** for visual insights into your job search progress

---

## 📝 Current Notes & Caveats

- **Analytics scope** — Analytics & Insights is intentionally limited to Jobs only
- **Category normalization** — All non-job, non-hackathon pages are routed into `Others`
- **Deadline extraction** — Depends on deadline text being present in the scraped page content
- **Match scores** — Requires an uploaded resume; without one, match scores show as `null`
- **Existing records** — Bad records in MongoDB do not auto-fix when classification logic changes

---

## 👥 Team

<table>
  <tr>
    <td align="center"><strong>Shreya Kumari</strong><br /><sub>Developer</sub></td>
    <td align="center"><strong>Vennela Jangiti</strong><br /><sub>Developer</sub></td>
    <td align="center"><strong>Hasini Nallan Chakravarthula</strong><br /><sub>Developer</sub></td>
    <td align="center"><strong>Akshaya Boda</strong><br /><sub>Developer</sub></td>
    <td align="center"><strong>Sasi Stuthika Adimulapu</strong><br /><sub>Developer</sub></td>
  </tr>
</table>

---

## 📄 License

This project uses components from [shadcn/ui](https://ui.shadcn.com/) under the [MIT License](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) and photos from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license).

---

<p align="center">
  <img src="mirae-logo.svg" alt="Mirae" width="40" />
  <br />
  <em>Built to keep your opportunity pipeline focused and organized.</em>
</p>
