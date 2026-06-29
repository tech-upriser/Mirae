<p align="center">
  <img src="mirae-logo.svg" alt="Mirae Logo" width="100" />
</p>

<h1 align="center">Mirae — Database Overview</h1>

<p align="center">
  <strong>Complete DBMS Reference: Schema Design, Queries, Indexes, Data Flow &amp; Architecture</strong>
</p>

---

## Table of Contents

1. [Database Technology & Why MongoDB](#1-database-technology--why-mongodb)
2. [Connection Architecture](#2-connection-architecture)
3. [Database Name & Collections](#3-database-name--collections)
4. [Schema Definitions (All Collections)](#4-schema-definitions-all-collections)
   - [4.1 Users Collection](#41-users-collection)
   - [4.2 Jobs Collection](#42-jobs-collection)
   - [4.3 Settings Collection](#43-settings-collection)
   - [4.4 CalendarEvents Collection](#44-calendarevents-collection)
5. [Indexing Strategy](#5-indexing-strategy)
6. [Relationships Between Collections](#6-relationships-between-collections)
7. [Complete Query Reference](#7-complete-query-reference)
   - [7.1 Authentication Queries](#71-authentication-queries)
   - [7.2 Profile Queries](#72-profile-queries)
   - [7.3 Tracker (Job/Opportunity) Queries](#73-tracker-jobopportunity-queries)
   - [7.4 Dashboard Queries](#74-dashboard-queries)
   - [7.5 Analytics Queries (Aggregation Pipelines)](#75-analytics-queries-aggregation-pipelines)
   - [7.6 Calendar Queries](#76-calendar-queries)
   - [7.7 Settings Queries](#77-settings-queries)
8. [Aggregation Pipelines (Detailed)](#8-aggregation-pipelines-detailed)
9. [Data Flow Architecture](#9-data-flow-architecture)
   - [9.1 End-to-End: Chrome Extension → Database](#91-end-to-end-chrome-extension--database)
   - [9.2 End-to-End: Frontend Dashboard → Database](#92-end-to-end-frontend-dashboard--database)
   - [9.3 Authentication Flow](#93-authentication-flow)
   - [9.4 Resume Upload Flow](#94-resume-upload-flow)
   - [9.5 Calendar Sync Flow](#95-calendar-sync-flow)
10. [Sorting & Searching Algorithms](#10-sorting--searching-algorithms)
11. [Data Validation & Constraints](#11-data-validation--constraints)
12. [Security & Access Control](#12-security--access-control)
13. [File Storage Strategy](#13-file-storage-strategy)
14. [CRUD Operations Summary Table](#14-crud-operations-summary-table)
15. [Mongoose ODM Details](#15-mongoose-odm-details)
16. [Sample Documents](#16-sample-documents)
17. [Common Viva Questions & Answers](#17-common-viva-questions--answers)

---

## 1. Database Technology & Why MongoDB

### What is MongoDB?

MongoDB is a **NoSQL document-oriented database** that stores data as flexible, JSON-like **BSON documents** (Binary JSON). Unlike traditional relational databases (MySQL, PostgreSQL), MongoDB does not use tables, rows, or fixed schemas.

### Why MongoDB Was Chosen for Mirae

| Reason | Explanation |
|---|---|
| **Flexible Schema** | Job postings from different websites have wildly different fields. MongoDB allows each document to have its own structure without altering a schema. |
| **Nested/Embedded Documents** | Skills (`{ all: [], matched: [], missing: [] }`), contacts, and social links are naturally nested. In SQL, this would require multiple JOIN tables. |
| **Array Fields** | Skills, history, tags, and social links are stored as native arrays — no separate junction tables needed. |
| **JSON-Native** | The backend (Node.js/Express) speaks JSON natively. MongoDB stores BSON (binary JSON), so there is zero impedance mismatch between the application and database layers. |
| **Horizontal Scalability** | MongoDB Atlas can scale horizontally via sharding as the user base grows. |
| **MongoDB Atlas (Cloud)** | Free-tier cloud hosting eliminates local installation and provides built-in replication, backups, and monitoring. |

### MongoDB vs SQL Comparison (Mirae Context)

| Concept | SQL (MySQL/PostgreSQL) | MongoDB (Mirae) |
|---|---|---|
| Table | Collection |
| Row | Document |
| Column | Field |
| Primary Key | `_id` (auto-generated ObjectId) |
| Foreign Key | Manual `userId` reference (ObjectId) |
| JOIN | Not needed — data is embedded or referenced |
| Schema | Fixed, requires ALTER TABLE | Flexible, defined in application code (Mongoose) |
| Skills storage | Requires 3 junction tables | Single embedded object: `{ all: [], matched: [], missing: [] }` |

---

## 2. Connection Architecture

### How the App Connects to MongoDB Atlas

```
┌──────────────────────┐        MONGO_URI (SRV)        ┌─────────────────────┐
│   Express Backend    │ ─────────────────────────────▶ │   MongoDB Atlas     │
│   (Node.js)          │        TLS/SSL encrypted       │   (Cloud Cluster)   │
│   Port: 5000         │                                │   Free Tier (M0)    │
└──────────────────────┘                                └─────────────────────┘
         │                                                       │
    Mongoose ODM                                          ┌──────┴──────┐
    (v9.5.0)                                              │  mirae DB   │
                                                          ├─────────────┤
                                                          │ users       │
                                                          │ jobs        │
                                                          │ settings    │
                                                          │ calendarevts│
                                                          └─────────────┘
```

### Connection Code (`config/db.js`)

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Successfully connected to MongoDB Database!');
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);  // Kill the server if DB connection fails
  }
};

module.exports = connectDB;
```

### Key Points

| Detail | Value |
|---|---|
| **Connection String Format** | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>` |
| **Protocol** | SRV (Service Record) — auto-discovers replica set members |
| **Encryption** | TLS/SSL enforced by Atlas |
| **Authentication** | Username + password from Atlas dashboard |
| **ODM** | Mongoose v9.5.0 |
| **Connection Pooling** | Mongoose maintains a default pool of 5 connections |
| **Fail Behavior** | If the connection fails, `process.exit(1)` is called — the server will NOT start |

### Connection String (`.env`)

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mirae?retryWrites=true&w=majority
JWT_SECRET=<your_jwt_secret>
GROQ_API_KEY=<your_groq_api_key>
PORT=5000
```

---

## 3. Database Name & Collections

| Database Name | `mirae` |
|---|---|
| **Hosting** | MongoDB Atlas (Free Tier M0) |
| **Region** | Configured during Atlas setup |

### Collections

| Collection Name | Mongoose Model | Purpose | Approx Document Size |
|---|---|---|---|
| `users` | `User` | User accounts, credentials, resume, social links, Google tokens | ~2–5 KB |
| `jobs` | `Job` | All tracked opportunities (jobs, hackathons, others) | ~1–3 KB |
| `settings` | `Settings` | Per-user notification, appearance, preference, and privacy settings | ~0.5 KB |
| `calendarevents` | `CalendarEvent` | Calendar events for interviews, deadlines, follow-ups | ~0.5–1 KB |

> **Note:** MongoDB automatically creates collections when the first document is inserted. Mongoose model names are auto-pluralized and lowercased to create collection names (e.g., `User` → `users`, `CalendarEvent` → `calendarevents`).

---

## 4. Schema Definitions (All Collections)

### 4.1 Users Collection

**Model File:** `Mirae-Backend/models/User.js`
**Collection Name:** `users`

```javascript
const userSchema = new mongoose.Schema({
  name:              { type: String, required: true, trim: true },
  email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:          { type: String, required: true },

  // Resume Data (for AI skill matching)
  resumeText:        { type: String, default: "" },
  resumeFileName:    { type: String, default: "" },
  resumeUploadedAt:  { type: Date, default: null },

  // Social Portfolio Links (embedded array of sub-documents)
  socialLinks: [{
    id:       String,
    platform: String,
    title:    String,
    url:      String,
    icon:     String,
  }],

  // Google Calendar OAuth tokens
  googleRefreshToken: { type: String, default: '' },
  googleAccessToken:  { type: String, default: '' },
  googleTokenExpiry:  { type: Number, default: 0 },

  // Profile Photo
  profilePhoto:       { type: String, default: '' }
}, {
  timestamps: true   // Adds createdAt and updatedAt automatically
});
```

#### Field-by-Field Explanation

| Field | Type | Required | Default | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto-generated | Unique identifier (primary key) |
| `name` | String | ✅ Yes | — | User's full name |
| `email` | String | ✅ Yes | — | Login email (unique, lowercase, trimmed) |
| `password` | String | ✅ Yes | — | bcrypt-hashed password (never stored in plain text) |
| `resumeText` | String | No | `""` | Extracted text from uploaded PDF resume |
| `resumeFileName` | String | No | `""` | Server-side filename of the stored resume file |
| `resumeUploadedAt` | Date | No | `null` | Timestamp of the most recent resume upload |
| `socialLinks` | Array | No | `[]` | Array of social/portfolio link objects |
| `socialLinks[].id` | String | No | — | Unique ID for the link entry |
| `socialLinks[].platform` | String | No | — | Platform name (e.g., "GitHub", "LinkedIn") |
| `socialLinks[].title` | String | No | — | Display label |
| `socialLinks[].url` | String | No | — | Full URL |
| `socialLinks[].icon` | String | No | — | Icon identifier |
| `googleRefreshToken` | String | No | `""` | Google OAuth2 refresh token for Calendar integration |
| `googleAccessToken` | String | No | `""` | Short-lived Google access token |
| `googleTokenExpiry` | Number | No | `0` | Epoch timestamp (ms) when the access token expires |
| `profilePhoto` | String | No | `""` | URL to the user's uploaded profile photo |
| `createdAt` | Date | Auto | Auto | Document creation timestamp |
| `updatedAt` | Date | Auto | Auto | Last modification timestamp |

#### Unique Constraints

- `email` has a **unique index** — no two users can register with the same email.

---

### 4.2 Jobs Collection

**Model File:** `Mirae-Backend/models/Job.js`
**Collection Name:** `jobs`

> Despite the name "Job", this collection stores **all** tracked opportunities: Jobs, Hackathons, and Others.

```javascript
const jobSchema = new mongoose.Schema({
  // User ownership
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Core scraped data
  title:       { type: String, required: true },
  company:     { type: String, required: true },
  url:         { type: String, required: true },
  description: { type: String },

  // Pipeline status
  status: {
    type: String,
    enum: ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'],
    default: 'Saved'
  },

  // AI-generated fields
  matchScore: { type: Number, default: null },
  skills: {
    all:     { type: [String], default: [] },
    matched: { type: [String], default: [] },
    missing: { type: [String], default: [] }
  },
  postedDate: { type: String, default: '' },

  // Detail fields
  location: { type: String, default: '' },
  salary:   { type: String, default: '' },
  category: {
    type: String,
    enum: ['Jobs', 'Hackathons', 'Others', 'Internships', 'Open Source', 'Other'],
    default: 'Jobs'
  },

  // Timeline & Tracking
  deadline:        { type: Date, default: null },
  rejectionReason: { type: String, default: 'Not specified' },
  appliedDate:     { type: Date, default: null },
  history: [{
    status: { type: String },
    date:   { type: Date, default: Date.now }
  }],
  contacts: {
    recruiterName:  { type: String, default: '' },
    hiringManager:  { type: String, default: '' }
  },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});
```

#### Field-by-Field Explanation

| Field | Type | Required | Default | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Unique identifier |
| `userId` | ObjectId (ref: User) | ✅ Yes | — | Links this opportunity to a specific user |
| `title` | String | ✅ Yes | — | Job/opportunity title |
| `company` | String | ✅ Yes | — | Company or organizer name |
| `url` | String | ✅ Yes | — | Original source URL |
| `description` | String | No | — | AI-generated 2-paragraph summary |
| `status` | String (enum) | No | `"Saved"` | Pipeline stage: Saved → Applied → Interviewing → Offer / Rejected |
| `matchScore` | Number | No | `null` | AI-calculated resume match score (0–100). `null` if no resume uploaded |
| `skills.all` | [String] | No | `[]` | All required skills extracted from opportunity |
| `skills.matched` | [String] | No | `[]` | Skills the user has (matched against resume) |
| `skills.missing` | [String] | No | `[]` | Skills the user lacks |
| `postedDate` | String | No | `""` | When the opportunity was posted (e.g., "2 days ago") |
| `location` | String | No | `""` | Job location or "Remote" |
| `salary` | String | No | `""` | Compensation range |
| `category` | String (enum) | No | `"Jobs"` | Classification: Jobs, Hackathons, or Others |
| `deadline` | Date | No | `null` | Application/registration deadline |
| `rejectionReason` | String | No | `"Not specified"` | Reason for rejection (if applicable) |
| `appliedDate` | Date | No | `null` | When the user applied/registered |
| `history` | Array | No | `[]` | Status change audit trail |
| `history[].status` | String | No | — | Status value at that point in time |
| `history[].date` | Date | No | `Date.now` | When the status was changed |
| `contacts.recruiterName` | String | No | `""` | Recruiter contact name |
| `contacts.hiringManager` | String | No | `""` | Hiring manager contact name |
| `notes` | String | No | `""` | User's personal notes |
| `createdAt` | Date | Auto | Auto | Document creation timestamp |
| `updatedAt` | Date | Auto | Auto | Last modification timestamp |

#### Indexes on Jobs Collection

```javascript
jobSchema.index({ userId: 1, status: 1, matchScore: -1 });   // Compound index
jobSchema.index({ title: 'text', company: 'text' });          // Text search index
```

---

### 4.3 Settings Collection

**Model File:** `Mirae-Backend/models/Settings.js`
**Collection Name:** `settings`

```javascript
const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  notifications: {
    followUpReminders:    { type: Boolean, default: true },
    deadlineAlerts:       { type: Boolean, default: true },
    interviewReminders:   { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    remindersEnabled:     { type: Boolean, default: true },
    browserNotifications: { type: Boolean, default: true },
    notificationTiming:   { type: String, enum: ["1day", "3days", "custom"], default: "1day" },
    customReminderHours:  { type: Number, default: 6, min: 1, max: 72 }
  },

  preferences: {
    defaultStatus:     { type: String, enum: ["Saved", "Applied", "Interviewing", "Offer", "Rejected"], default: "Saved" },
    defaultTags:       { type: [String], default: ["Remote", "Internship", "Urgent"] },
    duplicateDetection: { type: Boolean, default: true },
    autoTagging:        { type: Boolean, default: false }
  },

  appearance: {
    theme:       { type: String, enum: ["light", "dark"], default: "light" },
    accentStyle: { type: String, enum: ["gold", "soft-gold"], default: "gold" },
    cardLayout:  { type: String, enum: ["compact", "comfortable"], default: "comfortable" }
  },

  privacy: {
    securityActivityAlerts: { type: Boolean, default: true },
    profileDiscoverability: { type: Boolean, default: false }
  }
}, { timestamps: true });
```

#### Key Points

- **One-to-One relationship** with Users: each user has exactly one Settings document.
- `userId` has a **unique index** — enforces the one-to-one relationship at the database level.
- **Upsert pattern** is used: if no Settings document exists for a user, one is created with defaults.
- **Legacy migration**: the controller checks for old `user.settings` inline data and migrates it to the Settings collection on first access.

---

### 4.4 CalendarEvents Collection

**Model File:** `Mirae-Backend/models/CalendarEvent.js`
**Collection Name:** `calendarevents`

```javascript
const calendarEventSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  date:        { type: Date, required: true },
  startTime:   { type: String, trim: true, default: '' },
  endTime:     { type: String, trim: true, default: '' },
  type:        { type: String, enum: ['interview', 'deadline', 'follow-up', 'other'], default: 'other' },
  status:      { type: String, enum: ['pending', 'completed'], default: 'pending' },
  location:    { type: String, trim: true, default: '' },
  applyLink:   { type: String, trim: true, default: '' },
  userId:      { type: String, index: true, required: true },
  googleEventId: { type: String, trim: true, default: '', index: true },
  source:      { type: String, enum: ['manual', 'dashboard', 'google'], default: 'manual', index: true },
  sourceId:    { type: String, trim: true, default: '', index: true },
}, { timestamps: true });
```

#### Indexes on CalendarEvents

```javascript
calendarEventSchema.index({ userId: 1, date: 1 });
calendarEventSchema.index({ userId: 1, source: 1, sourceId: 1 });
calendarEventSchema.index({ userId: 1, googleEventId: 1 });
```

#### Source Types

| Source | Meaning |
|---|---|
| `manual` | User created the event manually via the Calendar UI |
| `dashboard` | Auto-synced from a tracked opportunity's deadline |
| `google` | Imported from Google Calendar via OAuth integration |

---

## 5. Indexing Strategy

### What are Indexes?

Indexes are data structures that MongoDB maintains alongside the actual data. They work like an index in a book — instead of scanning every document (full collection scan), MongoDB can jump directly to matching documents using the index. Without indexes, every query would require reading every document in the collection.

### All Indexes in Mirae

| Collection | Index | Type | Purpose |
|---|---|---|---|
| `users` | `{ email: 1 }` | Unique | Fast login lookups, prevents duplicate emails |
| `users` | `{ _id: 1 }` | Default (unique) | Primary key lookup |
| `jobs` | `{ userId: 1, status: 1, matchScore: -1 }` | Compound | Dashboard queries: filter by user + status, sort by match score descending |
| `jobs` | `{ title: 'text', company: 'text' }` | Text | Full-text search across job titles and company names |
| `jobs` | `{ _id: 1 }` | Default (unique) | Primary key lookup |
| `settings` | `{ userId: 1 }` | Unique | One settings doc per user, fast settings fetch |
| `calendarevents` | `{ userId: 1, date: 1 }` | Compound | Fetch user's events sorted by date |
| `calendarevents` | `{ userId: 1, source: 1, sourceId: 1 }` | Compound | Dashboard sync: find/update existing dashboard reminders |
| `calendarevents` | `{ userId: 1, googleEventId: 1 }` | Compound | Google Calendar sync: upsert by Google event ID |
| `calendarevents` | `{ googleEventId: 1 }` | Single | Quick lookup during Google → Mirae sync |
| `calendarevents` | `{ source: 1 }` | Single | Filter events by source type |
| `calendarevents` | `{ sourceId: 1 }` | Single | Find events by source identifier |

### Index Direction Explained

- `1` = **ascending** order
- `-1` = **descending** order
- `'text'` = **text search** index (supports MongoDB `$text` operator)

### Compound Index Example

```javascript
jobSchema.index({ userId: 1, status: 1, matchScore: -1 });
```

This single compound index optimizes the following query pattern:

```javascript
// "Show me all Applied jobs for this user, sorted by highest match score"
Job.find({ userId: "abc123", status: "Applied" }).sort({ matchScore: -1 });
```

MongoDB reads the index left to right: first filters by `userId`, then by `status`, then uses the pre-sorted `matchScore` descending order — no in-memory sort required.

### Text Index for Full-Text Search

```javascript
jobSchema.index({ title: 'text', company: 'text' });
```

This enables the dashboard search feature:

```javascript
// User types "Google" in the search bar
Job.find({ userId: "abc123", $text: { $search: "Google" } });
```

MongoDB tokenizes the search query, stems words, and looks up matching documents via the text index.

---

## 6. Relationships Between Collections

### Entity-Relationship Diagram

```
┌─────────────┐          ┌─────────────┐
│    users     │          │   settings  │
│─────────────│          │─────────────│
│ _id (PK)    │◀────1:1──│ userId (FK) │
│ name        │          │ notifications│
│ email       │          │ preferences │
│ password    │          │ appearance  │
│ resumeText  │          │ privacy     │
│ socialLinks │          └─────────────┘
│ profilePhoto│
│ googleTokens│
└──────┬──────┘
       │
       │ 1 : N
       │
       ▼
┌─────────────────┐     ┌──────────────────┐
│      jobs       │     │  calendarevents  │
│─────────────────│     │──────────────────│
│ _id (PK)        │     │ _id (PK)         │
│ userId (FK) ────│─┐   │ userId (FK) ─────│─── references users._id
│ title           │ │   │ title            │
│ company         │ │   │ date             │
│ status          │ │   │ type             │
│ matchScore      │ │   │ source           │
│ skills {}       │ │   │ sourceId ────────│─── may reference jobs._id
│ category        │ │   │ googleEventId    │
│ deadline        │ │   └──────────────────┘
│ history []      │ │
│ contacts {}     │ │
│ notes           │ │
└─────────────────┘ │
                    │
                    └──── same user can own N jobs and N calendar events
```

### Relationship Types

| Relationship | Type | Implementation |
|---|---|---|
| User → Jobs | **One-to-Many** | `jobs.userId` references `users._id` |
| User → Settings | **One-to-One** | `settings.userId` references `users._id` (unique) |
| User → CalendarEvents | **One-to-Many** | `calendarevents.userId` stores `users._id` as String |
| Job → CalendarEvent | **Implicit link** | `calendarevents.sourceId` = `"dashboard-job-{jobId}"` when `source = "dashboard"` |

### Why References Instead of Embedding?

| Approach | Used For | Reasoning |
|---|---|---|
| **Embedding** | `skills`, `contacts`, `history`, `socialLinks` | These sub-documents are always accessed with their parent. They don't grow unboundedly. |
| **Referencing** | `jobs.userId → users._id` | A user can have hundreds of jobs. Embedding all jobs inside a user document would exceed MongoDB's 16 MB document size limit. |

---

## 7. Complete Query Reference

### 7.1 Authentication Queries

#### Register (Create User)

```javascript
// Check if email already exists
const existingUser = await User.findOne({ email: normalizedEmail });

// Create new user
const user = await User.create({
  name: name.trim(),
  email: normalizedEmail,
  password: hashedPassword,    // bcrypt.hash(password, 10)
});

// Generate JWT token
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
```

**Mongoose Method:** `Model.findOne()` — returns the first document matching the filter, or `null`.
**Mongoose Method:** `Model.create()` — creates and saves a new document.

#### Login (Find User)

```javascript
// Find user by email
const user = await User.findOne({ email: normalizedEmail });

// Compare password
const passwordMatches = await bcrypt.compare(password, user.password);

// Generate token
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
```

---

### 7.2 Profile Queries

#### Get Profile

```javascript
const user = await User.findById(req.user.id).select('-password');
```

**`.select('-password')`** — Projection: returns all fields EXCEPT the password hash. This is a security best practice.

#### Update Profile (Name & Email)

```javascript
// Check for email uniqueness (exclude current user)
const existingUser = await User.findOne({
  email: normalizedEmail,
  _id: { $ne: req.user.id }     // $ne = "not equal" operator
});

// Atomic update
const updatedUser = await User.findByIdAndUpdate(
  req.user.id,
  {
    $set: {
      name: name.trim(),
      email: normalizedEmail,
    }
  },
  { new: true }                 // Return the UPDATED document, not the old one
).select("-password");
```

**`$set` operator** — Only updates the specified fields, leaving everything else unchanged.
**`{ new: true }`** — Mongoose option that returns the document AFTER the update is applied.

#### Upload Resume (File + Text Extraction)

```javascript
// 1. Extract text from PDF using pdf-parse library
const buffer = await fs.promises.readFile(file.path);
const parsed = await pdfParse(buffer);
const resumeText = parsed.text.trim();

// 2. Update multiple fields atomically
const updatedUser = await User.findByIdAndUpdate(
  req.user.id,
  {
    resumeText,                               // Extracted text for AI matching
    resumeFileName: req.file.filename,        // Server-side filename
    resumeUploadedAt: new Date(),             // Upload timestamp
  },
  { new: true }
).select('-password');
```

#### Delete Resume

```javascript
const user = await User.findById(req.user.id);
user.resumeText = '';
user.resumeFileName = '';
user.resumeUploadedAt = null;
await user.save();    // Triggers Mongoose validation and middleware
```

#### Update Social Links

```javascript
const updatedUser = await User.findByIdAndUpdate(
  req.user.id,
  { socialLinks },     // Replace the entire socialLinks array
  { new: true }
).select('-password');
```

#### Change Password

```javascript
const user = await User.findById(req.user.id);
const passwordMatches = await bcrypt.compare(currentPassword, user.password);
const hashedPassword = await bcrypt.hash(newPassword, 10);
user.password = hashedPassword;
await user.save();
```

#### Delete Account (Cascading Delete)

```javascript
await Promise.all([
  Job.deleteMany({ userId }),        // Delete ALL user's jobs
  User.findByIdAndDelete(userId)     // Delete the user document
]);
```

**`Promise.all()`** — Executes both delete operations in parallel for performance.
**`deleteMany()`** — Removes ALL documents matching the filter. This is the cascading delete.

---

### 7.3 Tracker (Job/Opportunity) Queries

#### Create Job (AI + Save)

```javascript
// 1. Fetch user's resume for AI skill matching
const user = await User.findById(req.user.id);

// 2. Send to Groq AI for extraction (not a DB query)

// 3. Save the enriched document
const newJob = new Job({
  title: finalTitle,
  company: finalCompany,
  url: url,
  description: safeDescription,
  matchScore: safeMatchScore,
  skills: safeSkills,
  location: aiResult.location,
  salary: aiResult.salary,
  deadline: finalDeadline,
  category: finalCategory,
  status: finalStatus,
  appliedDate: appliedDate,
  history: [{ status: finalStatus, date: createdAt }],
  userId: req.user.id,
  createdAt: createdAt,
  updatedAt: createdAt
});
await newJob.save();
```

#### Get All Jobs (for a user)

```javascript
const jobs = await Job.find({ userId: req.user.id }).sort({ createdAt: -1 });
```

**`.sort({ createdAt: -1 })`** — Sort by newest first (descending).

#### Delete Job (with ownership check)

```javascript
const deletedJob = await Job.findOneAndDelete({
  _id: req.params.id,
  userId: req.user.id,       // Ensures user can only delete THEIR OWN jobs
});
```

**`findOneAndDelete()`** — Atomically finds and deletes a document. Returns the deleted document or `null`.
**Ownership check:** The `userId` filter prevents a user from deleting another user's data.

#### Update Job Status

```javascript
const job = await Job.findOne({ _id: req.params.id, userId: req.user.id });
job.status = status;
job.history.push({ status, date: new Date() });   // Append to audit trail
await job.save();
```

#### Update Contacts

```javascript
const job = await Job.findOneAndUpdate(
  { _id: req.params.id, userId: req.user.id },
  {
    $set: {
      contacts: { recruiterName, hiringManager }
    }
  },
  { new: true }
);
```

#### Update Notes

```javascript
const job = await Job.findOneAndUpdate(
  { _id: req.params.id, userId: req.user.id },
  { $set: { notes } },
  { new: true }
);
```

---

### 7.4 Dashboard Queries

#### Get Summary (Aggregated Counts)

```javascript
const [totalJobs, saved, applied, interviewing, offers, rejected] = await Promise.all([
  Job.countDocuments({ userId: req.user.id }),
  Job.countDocuments({ userId: req.user.id, status: 'Saved' }),
  Job.countDocuments({ userId: req.user.id, status: 'Applied' }),
  Job.countDocuments({ userId: req.user.id, status: 'Interviewing' }),
  Job.countDocuments({ userId: req.user.id, status: 'Offer' }),
  Job.countDocuments({ userId: req.user.id, status: 'Rejected' }),
]);
```

**`countDocuments()`** — Returns the number of documents matching the filter. Does NOT load documents into memory — runs as a server-side count operation.
**`Promise.all()`** — All 6 count queries run in parallel, significantly faster than sequential execution.

#### Get Recent Jobs (with Search & Sort)

```javascript
const query = { userId: req.user.id };

// Full-text search (if search query provided)
if (search) {
  query.$text = { $search: search };    // Uses the text index on title + company
}

// Dynamic sort field
const sortField = sortBy === 'matchScore'
  ? { status: 1, matchScore: -1, createdAt: -1 }     // By match score
  : { status: 1, createdAt: -1 };                     // By newest

const recentJobs = await Job.find(query)
  .sort(sortField)
  .limit(50)                    // Cap results at 50
  .select('company title status category url description matchScore skills salary location appliedDate deadline createdAt postedDate history contacts notes');
```

**`$text: { $search }`** — MongoDB's full-text search operator. Uses the text index.
**`.limit(50)`** — Caps the result set to prevent excessive memory usage.
**`.select(...)`** — Projection: only fetch the listed fields, reducing network transfer.

---

### 7.5 Analytics Queries (Aggregation Pipelines)

> Analytics queries use MongoDB's **Aggregation Framework** — a server-side data processing pipeline. Each stage transforms the data and passes results to the next stage.

See [Section 8](#8-aggregation-pipelines-detailed) for detailed breakdowns.

---

### 7.6 Calendar Queries

#### Get All Events

```javascript
const events = await CalendarEvent.find({ userId }).sort({ date: 1 });
```

**`.sort({ date: 1 })`** — Ascending date order (earliest first). Uses `{ userId: 1, date: 1 }` compound index.

#### Create Event

```javascript
const newEvent = new CalendarEvent({
  title, description, date, startTime, endTime, type, status, location, applyLink, userId
});
const savedEvent = await newEvent.save();
```

#### Sync Dashboard Reminders (Upsert Pattern)

```javascript
// Find all user's Jobs/Hackathons that have a deadline
const jobsWithDeadlines = await Job.find({
  userId,
  deadline: { $ne: null },
});

// For each job with a deadline, upsert a calendar event
const calendarEvent = await CalendarEvent.findOneAndUpdate(
  { userId, source: 'dashboard', sourceId: reminder.sourceId },   // Find condition
  { $set: reminder },                                             // Update data
  { new: true, upsert: true, setDefaultsOnInsert: true }          // Options
);

// Clean up stale dashboard reminders (deleted/changed deadlines)
await CalendarEvent.deleteMany({
  userId,
  source: 'dashboard',
  sourceId: { $nin: activeSourceIds },    // $nin = "not in" array
});
```

**Upsert (`upsert: true`)** — If a matching document exists, update it. If not, create a new one. This is a crucial pattern for sync operations.
**`$nin` operator** — "Not In" — matches documents where the field value is NOT in the provided array.

#### Delete Event

```javascript
const deletedEvent = await CalendarEvent.findOneAndDelete({ _id: req.params.id, userId });
```

---

### 7.7 Settings Queries

#### Get Settings (with lazy initialization)

```javascript
// Try to find existing settings
let settings = await Settings.findOne({ userId: user._id });

// If none exist, create with defaults (first-time setup)
if (!settings) {
  settings = await Settings.create({
    userId: user._id,
    ...normalizeSettingsPayload(legacyData)
  });
}
```

#### Update Settings (Upsert)

```javascript
const settingsDoc = await Settings.findOneAndUpdate(
  { userId: user._id },
  { $set: payload },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);
```

#### Reset Settings

```javascript
const settingsDoc = await Settings.findOneAndUpdate(
  { userId: user._id },
  { $set: DEFAULT_SETTINGS },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);
```

#### Clear All Application Data

```javascript
await Job.deleteMany({ userId });    // Bulk delete all jobs for this user
```

---

## 8. Aggregation Pipelines (Detailed)

MongoDB's Aggregation Framework processes data through a pipeline of stages. Each stage transforms the data and passes the result to the next stage.

### Pipeline 1: Application Trends (Daily Counts)

**Purpose:** Show how many opportunities the user saved per day (for the trends chart).

```javascript
const trends = await Job.aggregate([
  // Stage 1: Match — filter to this user's jobs only
  {
    $match: {
      userId: new mongoose.Types.ObjectId(req.user.id),
      category: 'Jobs',
      createdAt: { $ne: null },
    },
  },

  // Stage 2: Group — group by year/month/day, count documents
  {
    $group: {
      _id: {
        year:  { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day:   { $dayOfMonth: '$createdAt' },
      },
      count: { $sum: 1 },
    },
  },

  // Stage 3: Sort — chronological order
  {
    $sort: {
      '_id.year': 1,
      '_id.month': 1,
      '_id.day': 1,
    },
  },

  // Stage 4: Project — format dates as "YYYY-MM-DD" strings
  {
    $project: {
      _id: 0,
      date: {
        $concat: [
          { $toString: '$_id.year' }, '-',
          { $cond: [{ $lt: ['$_id.month', 10] },
            { $concat: ['0', { $toString: '$_id.month' }] },
            { $toString: '$_id.month' }] }, '-',
          { $cond: [{ $lt: ['$_id.day', 10] },
            { $concat: ['0', { $toString: '$_id.day' }] },
            { $toString: '$_id.day' }] },
        ],
      },
      count: 1,
    },
  },
]);
```

**Output Example:**
```json
[
  { "date": "2026-04-01", "count": 3 },
  { "date": "2026-04-02", "count": 5 },
  { "date": "2026-04-03", "count": 1 }
]
```

**Operators Used:**
- `$match` — Filter documents (like SQL WHERE)
- `$group` — Group documents and compute aggregates (like SQL GROUP BY)
- `$sum: 1` — Count one for each document in the group
- `$year`, `$month`, `$dayOfMonth` — Date extraction operators
- `$sort` — Order the results
- `$project` — Reshape the output (like SQL SELECT)
- `$concat` — String concatenation
- `$cond` — Conditional (ternary) expression: if month < 10, prepend "0"

---

### Pipeline 2: Skill Gap Analysis

**Purpose:** Find the most frequently missing skills across all tracked jobs.

```javascript
const skillGapData = await Job.aggregate([
  { $match: { userId, category: 'Jobs' } },

  // Unwind — explode the skills.missing array into separate documents
  { $unwind: '$skills.missing' },

  // Filter out empty/placeholder values
  {
    $match: {
      'skills.missing': {
        $type: 'string',
        $nin: ['', 'Unknown', 'Not specified'],
      },
    },
  },

  // Group by skill name and count occurrences
  {
    $group: {
      _id: '$skills.missing',
      frequency: { $sum: 1 },
    },
  },

  // Sort by most frequent first, then alphabetically
  { $sort: { frequency: -1, _id: 1 } },

  // Only return top 5
  { $limit: 5 },

  // Reshape the output
  {
    $project: {
      _id: 0,
      skill: '$_id',
      frequency: 1,
    },
  },
]);
```

**Output Example:**
```json
[
  { "skill": "Docker", "frequency": 12 },
  { "skill": "Kubernetes", "frequency": 8 },
  { "skill": "AWS", "frequency": 7 },
  { "skill": "System Design", "frequency": 5 },
  { "skill": "GraphQL", "frequency": 4 }
]
```

**`$unwind`** — Takes an array field and creates one document per array element. For example, a job with `skills.missing: ["Docker", "AWS"]` becomes two documents.

---

### Pipeline 3: Match Insights (`$facet` — Multi-Pipeline)

**Purpose:** Compute multiple analytics in a single database round-trip.

```javascript
const [result] = await Job.aggregate([
  { $match: { userId, category: 'Jobs' } },

  {
    $facet: {
      // Sub-pipeline 1: Average match score across ALL jobs
      allJobsAverage: [
        { $match: { matchScore: { $ne: null } } },
        { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
      ],

      // Sub-pipeline 2: Average match score for INTERVIEWS + OFFERS only
      interviewAverage: [
        { $match: { status: { $in: ['Interviewing', 'Offer'] }, matchScore: { $ne: null } } },
        { $group: { _id: null, avgScore: { $avg: '$matchScore' } } },
      ],

      // Sub-pipeline 3: Most recent rejected jobs
      rejectedJobs: [
        { $match: { status: 'Rejected' } },
        { $sort: { updatedAt: -1 } },
        { $limit: 4 },
        { $project: { _id: 0, company: 1, title: 1, rejectionReason: 1 } },
      ],

      // Sub-pipeline 4: Most recent offered jobs
      offeredJobs: [
        { $match: { status: { $in: ['Offer', 'Offered'] } } },
        { $sort: { updatedAt: -1 } },
        { $limit: 4 },
        { $project: { _id: 0, company: 1, title: 1 } },
      ],
    },
  },
]);
```

**`$facet`** — Runs multiple aggregation sub-pipelines within a single stage, against the same input documents. This avoids making 4 separate queries.
**`$avg`** — Computes the average of a numeric field across grouped documents.
**`$in`** — Matches any value in the provided array.

---

## 9. Data Flow Architecture

### 9.1 End-to-End: Chrome Extension → Database

```
┌──────────────┐    Right-click     ┌──────────────┐    HTTP POST      ┌──────────────┐
│  Job Posting │  "Save to Mirae"   │   Chrome     │  /api/tracker     │   Express    │
│  Website     │ ──────────────────▶│  Extension   │ ────────────────▶ │   Backend    │
└──────────────┘                    │  content.js   │   + JWT token     │              │
                                    │  background.js│   + rawText       │              │
                                    └──────────────┘   + pageURL        │              │
                                                                        │       │      │
                                                                        │       ▼      │
                                                                        │  ┌────────┐  │
                                                                        │  │ MongoDB │  │
                                                                        │  │ User    │  │
                                                                        │  │ .find() │  │
                                                                        │  └───┬────┘  │
                                                                        │      │       │
                                                                        │      │ resume│
                                                                        │      │ text  │
                                                                        │      ▼       │
                                                                        │  ┌────────┐  │
                                                                        │  │ Groq   │  │
                                                                        │  │ AI API │  │
                                                                        │  │ Llama  │  │
                                                                        │  └───┬────┘  │
                                                                        │      │       │
                                                                        │      │ JSON  │
                                                                        │      ▼       │
                                                                        │  ┌────────┐  │
                                                                        │  │MongoDB │  │
                                                                        │  │Job     │  │
                                                                        │  │.save() │  │
                                                                        │  └────────┘  │
                                                                        └──────────────┘
```

### 9.2 End-to-End: Frontend Dashboard → Database

```
┌───────────────────┐    fetch()     ┌──────────────┐    Mongoose     ┌──────────────┐
│  React Dashboard  │  GET /api/     │   Express    │    queries      │  MongoDB     │
│  (Browser)        │ ─────────────▶ │   Backend    │ ──────────────▶ │  Atlas       │
│                   │   + Bearer     │              │                  │              │
│  dashboardService │     token      │  controller  │   ◀─────────── │  Jobs,Users  │
│  analyticsService │                │  functions   │   JSON results   │  Settings    │
│  trackerService   │ ◀───────────── │              │                  │  Calendar    │
│  calendarService  │   JSON resp    └──────────────┘                  └──────────────┘
└───────────────────┘
```

### 9.3 Authentication Flow

```
1. User submits email + password

2. POST /api/auth/login
   │
   ├── User.findOne({ email }) ─── MongoDB lookup by email index
   │
   ├── bcrypt.compare(password, user.password) ─── Hash comparison
   │
   ├── jwt.sign({ id: user._id }, secret, { expiresIn: '7d' })
   │   └── Creates a signed token containing user's MongoDB _id
   │
   └── Response: { token, user: { id, name, email } }

3. Frontend stores token in localStorage

4. Every subsequent request includes:
   Authorization: Bearer <token>

5. authMiddleware.js on every protected route:
   ├── Extracts token from header
   ├── jwt.verify(token, secret, callback) ─── Validates signature
   ├── Sets req.user = { id: decoded.id }
   └── Calls next() ─── controller executes
```

### 9.4 Resume Upload Flow

```
1. User selects PDF file in the UI

2. POST /api/profile/resume/upload (multipart/form-data)
   │
   ├── Multer middleware saves file to /uploads/resumes/
   │   └── Filename: resume-{userId}-{timestamp}.pdf
   │
   ├── pdf-parse extracts text from the PDF buffer
   │
   ├── User.findByIdAndUpdate() ─── Stores resumeText in MongoDB
   │
   └── The resumeText is now available for AI skill matching
       └── When POST /api/tracker is called:
           └── user.resumeText is sent to Groq AI as context
```

### 9.5 Calendar Sync Flow

```
Tracked Opportunity (Job model)
         │
         │ has deadline?
         ▼
POST /api/calendar/sync-dashboard-reminders
         │
         ├── Job.find({ userId, deadline: { $ne: null } })
         │
         ├── For each job with a deadline:
         │   └── CalendarEvent.findOneAndUpdate(
         │         { userId, source: 'dashboard', sourceId: 'dashboard-job-{jobId}' },
         │         { $set: reminderData },
         │         { upsert: true }
         │       )
         │
         └── CalendarEvent.deleteMany(
               { userId, source: 'dashboard', sourceId: { $nin: activeIds } }
             )
             └── Removes stale reminders for deleted/changed deadlines
```

---

## 10. Sorting & Searching Algorithms

### Sorting Methods Used

| Location | Sort Expression | Meaning |
|---|---|---|
| **Dashboard (newest)** | `{ status: 1, createdAt: -1 }` | Group by status (ascending alphabetical), then newest first within each group |
| **Dashboard (match score)** | `{ status: 1, matchScore: -1, createdAt: -1 }` | Group by status, then highest match score first, then newest |
| **Tracker fetch** | `{ createdAt: -1 }` | Simple newest-first |
| **Calendar events** | `{ date: 1 }` | Chronological (earliest first) |
| **Trends pipeline** | `{ '_id.year': 1, '_id.month': 1, '_id.day': 1 }` | Chronological after aggregation |
| **Skill gap** | `{ frequency: -1, _id: 1 }` | Most frequent first, alphabetical tiebreak |

### How MongoDB Sorts

1. **With an index** — If the sort fields match an index, MongoDB reads documents in index order. This is an **index scan** (fast, O(log n)).
2. **Without an index** — MongoDB loads all matching documents into a memory buffer and performs an **in-memory sort**. Limited to 100 MB by default.
3. The compound index `{ userId: 1, status: 1, matchScore: -1 }` covers the dashboard's most common sort pattern without needing an in-memory sort.

### Full-Text Search

```javascript
// Dashboard search bar
const query = { userId: req.user.id };
if (search) {
  query.$text = { $search: search };
}
const jobs = await Job.find(query).sort(sortField).limit(50);
```

**How `$text` search works internally:**

1. MongoDB tokenizes the search string into individual words
2. Each word is stemmed (e.g., "running" → "run")
3. Stop words are removed (e.g., "the", "a", "is")
4. MongoDB looks up each stemmed term in the text index
5. Documents containing ANY of the search terms are returned
6. Results can optionally be scored by relevance using `{ $meta: "textScore" }`

**Text Index Definition:**

```javascript
jobSchema.index({ title: 'text', company: 'text' });
```

This means searching "Google Engineer" will match documents where the `title` OR `company` field contains "Google" or "Engineer".

---

## 11. Data Validation & Constraints

### Mongoose-Level Validation

| Collection | Field | Validation | Error if violated |
|---|---|---|---|
| `users` | `name` | `required: true` | "Name is required" |
| `users` | `email` | `required: true, unique: true, lowercase: true` | "User already exists" (409 Conflict) |
| `users` | `password` | `required: true` | Caught at registration |
| `jobs` | `userId` | `required: true` | Cannot create job without user |
| `jobs` | `title` | `required: true` | "Title is required" |
| `jobs` | `company` | `required: true` | Falls back to URL-based company name |
| `jobs` | `url` | `required: true` | Falls back to `"https://unknown"` |
| `jobs` | `status` | `enum: ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected']` | Mongoose validation error |
| `jobs` | `category` | `enum: ['Jobs', 'Hackathons', 'Others', ...]` | Mongoose validation error |
| `calendarevents` | `title` | `required: true` | "Title is required" |
| `calendarevents` | `date` | `required: true` | "Date is required" |
| `calendarevents` | `type` | `enum: ['interview', 'deadline', 'follow-up', 'other']` | Validation error |
| `settings` | `userId` | `required: true, unique: true` | One per user only |

### Application-Level Validation

| Validation | Code Location | Rule |
|---|---|---|
| Minimum text for scraping | `trackerController.js` | `rawText.length < 50` → 400 error |
| Email format | `profileController.js` | Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| Password minimum length | `profileController.js` | `newPassword.length < 6` → 400 error |
| Resume text minimum | `profileController.js` | `resumeText.length < 20` → 400 error |
| Match score range | `trackerController.js` | `Math.max(0, Math.min(100, score))` → clamped 0–100 |
| Description max length | `trackerController.js` | Truncated at 2000 characters |
| Custom reminder hours | `settingsController.js` | Clamped between 1 and 72 |
| Tags maximum count | `settingsController.js` | Capped at 10 tags max |
| File size | `uploadMiddleware.js` | Max 5 MB for both photos and resumes |
| File type (photos) | `uploadMiddleware.js` | Only `image/*` MIME types accepted |
| File type (resumes) | `uploadMiddleware.js` | Only `.pdf`, `.txt`, `.md` accepted |

---

## 12. Security & Access Control

### Authentication Mechanism

| Component | Technology | Detail |
|---|---|---|
| **Password Hashing** | bcrypt (salt rounds: 10) | Passwords are never stored in plain text |
| **Token Format** | JWT (JSON Web Token) | Payload: `{ id: user._id }` |
| **Token Expiry** | 7 days | After 7 days, the user must log in again |
| **Token Storage** | Browser localStorage | Stored client-side under key `"token"` |
| **Token Transmission** | `Authorization: Bearer <token>` header | Every protected API call includes this header |

### JWT Middleware (`authMiddleware.js`)

```javascript
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];   // Extract token
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify signature
  req.user = { id: decoded.id };                             // Attach to request
  next();                                                    // Proceed to controller
};
```

### Data Isolation (Multi-Tenancy)

Every database query for user-specific data includes `userId` in the filter:

```javascript
// A user can ONLY see/modify their own data
Job.find({ userId: req.user.id });
Job.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
CalendarEvent.find({ userId });
Settings.findOne({ userId: user._id });
```

This ensures **complete data isolation** between users at the query level — one user can never access another user's data.

### Password Security

```javascript
// Registration: hash before storing
const hashedPassword = await bcrypt.hash(password, 10);

// Login: compare against hash
const passwordMatches = await bcrypt.compare(inputPassword, user.password);
```

- Salt rounds = 10 means bcrypt performs 2^10 (1024) iterations of the hashing algorithm
- Even if the database is compromised, passwords cannot be reverse-engineered

### Projection (Password Exclusion)

Every profile query excludes the password:

```javascript
User.findById(req.user.id).select('-password');
```

The hashed password is **never** sent to the frontend.

---

## 13. File Storage Strategy

### Where Files are Stored

Files are stored on the **server's local filesystem**, NOT in MongoDB.

| File Type | Upload Directory | Naming Convention |
|---|---|---|
| **Profile Photos** | `Mirae-Backend/uploads/profile/` | `profile-{userId}-{timestamp}.{ext}` |
| **Resumes** | `Mirae-Backend/uploads/resumes/` | `resume-{userId}-{timestamp}.{ext}` |

### What IS Stored in MongoDB

| Data | Stored In | Purpose |
|---|---|---|
| Resume **text** | `users.resumeText` | Extracted text for AI skill matching |
| Resume **filename** | `users.resumeFileName` | Track which file belongs to user |
| Resume **upload date** | `users.resumeUploadedAt` | Display upload timestamp |
| Profile photo **URL** | `users.profilePhoto` | URL like `http://localhost:5000/uploads/profile/profile-abc-123.jpg` |

### Why Not Store Files in MongoDB?

MongoDB documents have a **16 MB size limit**. A resume PDF can be 2–5 MB, and profile photos can be several MB. Storing binary files in documents would waste database storage and slow down queries. Instead, only the text and metadata go into MongoDB, while the actual files are served as static assets via Express.

### Static File Serving

```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

This makes all files in the `uploads/` directory accessible via HTTP, e.g., `http://localhost:5000/uploads/profile/photo.jpg`.

---

## 14. CRUD Operations Summary Table

| Operation | Collection | Mongoose Method | API Endpoint | HTTP Method |
|---|---|---|---|---|
| **Create** user | `users` | `User.create()` | `/api/auth/register` | POST |
| **Read** user by email | `users` | `User.findOne({ email })` | `/api/auth/login` | POST |
| **Read** user by ID | `users` | `User.findById(id)` | `/api/profile` | GET |
| **Update** user profile | `users` | `User.findByIdAndUpdate()` | `/api/profile/update` | PUT |
| **Update** password | `users` | `user.save()` | `/api/profile/change-password` | PUT |
| **Update** resume | `users` | `User.findByIdAndUpdate()` | `/api/profile/resume/upload` | POST |
| **Delete** resume | `users` | `user.save()` | `/api/profile/resume` | DELETE |
| **Update** social links | `users` | `User.findByIdAndUpdate()` | `/api/profile/social-links` | PUT |
| **Delete** user (cascade) | `users` + `jobs` | `User.findByIdAndDelete()` + `Job.deleteMany()` | `/api/profile/delete` | DELETE |
| **Create** job/opportunity | `jobs` | `new Job().save()` | `/api/tracker` | POST |
| **Read** all jobs (user) | `jobs` | `Job.find({ userId })` | `/api/tracker` | GET |
| **Read** recent jobs | `jobs` | `Job.find().sort().limit()` | `/api/dashboard/recent` | GET |
| **Read** job counts | `jobs` | `Job.countDocuments()` | `/api/dashboard/summary` | GET |
| **Update** job status | `jobs` | `job.save()` | `/api/tracker/:id/status` | PUT |
| **Update** contacts | `jobs` | `Job.findOneAndUpdate()` | `/api/tracker/:id/contacts` | PUT |
| **Update** notes | `jobs` | `Job.findOneAndUpdate()` | `/api/tracker/:id/notes` | PUT |
| **Delete** job | `jobs` | `Job.findOneAndDelete()` | `/api/tracker/:id` | DELETE |
| **Delete** all jobs | `jobs` | `Job.deleteMany()` | `/api/settings/clear-data` | POST |
| **Read** analytics | `jobs` | `Job.aggregate()` | `/api/analytics/*` | GET |
| **Create** calendar event | `calendarevents` | `new CalendarEvent().save()` | `/api/calendar` | POST |
| **Read** all events | `calendarevents` | `CalendarEvent.find()` | `/api/calendar` | GET |
| **Read** single event | `calendarevents` | `CalendarEvent.findOne()` | `/api/calendar/:id` | GET |
| **Update** event | `calendarevents` | `CalendarEvent.findOneAndUpdate()` | `/api/calendar/:id` | PUT |
| **Delete** event | `calendarevents` | `CalendarEvent.findOneAndDelete()` | `/api/calendar/:id` | DELETE |
| **Upsert** sync reminders | `calendarevents` | `CalendarEvent.findOneAndUpdate({ upsert: true })` | `/api/calendar/sync-dashboard-reminders` | POST |
| **Read** settings | `settings` | `Settings.findOne()` | `/api/settings` | GET |
| **Upsert** settings | `settings` | `Settings.findOneAndUpdate({ upsert: true })` | `/api/settings` | PUT |
| **Reset** settings | `settings` | `Settings.findOneAndUpdate()` | `/api/settings/reset` | POST |

---

## 15. Mongoose ODM Details

### What is an ODM?

**ODM** stands for **Object-Document Mapper**. Mongoose maps JavaScript objects to MongoDB documents, similar to how an ORM (Object-Relational Mapper) maps objects to SQL rows. Mongoose provides:

- **Schema definitions** — Structure enforcement on schemaless MongoDB
- **Validation** — Data type and constraint checking before writes
- **Middleware** — Pre/post hooks on save, validate, remove, etc.
- **Query builders** — Chainable API: `.find().sort().limit().select()`
- **Population** — Resolve ObjectId references (like JOINs)

### Key Mongoose Methods Used in Mirae

| Method | What It Does | SQL Equivalent |
|---|---|---|
| `Model.create(data)` | Insert one document | `INSERT INTO` |
| `Model.find(filter)` | Find all matching documents | `SELECT * WHERE` |
| `Model.findOne(filter)` | Find first matching document | `SELECT * WHERE LIMIT 1` |
| `Model.findById(id)` | Find by `_id` | `SELECT * WHERE _id = ?` |
| `Model.findByIdAndUpdate(id, update, options)` | Find by ID and update | `UPDATE WHERE _id = ?` |
| `Model.findOneAndUpdate(filter, update, options)` | Find one and update | `UPDATE WHERE ... LIMIT 1` |
| `Model.findOneAndDelete(filter)` | Find one and delete | `DELETE WHERE ... LIMIT 1` |
| `Model.deleteMany(filter)` | Delete all matching | `DELETE WHERE` |
| `Model.countDocuments(filter)` | Count matching documents | `SELECT COUNT(*)` |
| `Model.aggregate(pipeline)` | Run aggregation pipeline | Complex SQL with GROUP BY, JOINs, subqueries |
| `doc.save()` | Save/update a document instance | `INSERT` or `UPDATE` |
| `.select('field1 field2')` | Include only these fields | `SELECT field1, field2` |
| `.select('-field')` | Exclude a field | `SELECT * (except field)` |
| `.sort({ field: 1 })` | Sort ascending | `ORDER BY field ASC` |
| `.sort({ field: -1 })` | Sort descending | `ORDER BY field DESC` |
| `.limit(n)` | Cap results | `LIMIT n` |

### MongoDB Update Operators Used

| Operator | Purpose | Example |
|---|---|---|
| `$set` | Set specific fields | `{ $set: { name: "New Name" } }` |
| `$ne` | Not equal | `{ deadline: { $ne: null } }` |
| `$nin` | Not in array | `{ sourceId: { $nin: activeIds } }` |
| `$in` | In array | `{ status: { $in: ['Offer', 'Offered'] } }` |
| `$text` | Full-text search | `{ $text: { $search: "Google" } }` |

### MongoDB Aggregation Operators Used

| Operator | Purpose |
|---|---|
| `$match` | Filter documents (like WHERE) |
| `$group` | Group and aggregate (like GROUP BY) |
| `$sort` | Order results |
| `$project` | Reshape output (like SELECT) |
| `$unwind` | Flatten arrays |
| `$facet` | Run multiple pipelines in parallel |
| `$limit` | Cap results |
| `$sum` | Sum/count |
| `$avg` | Average |
| `$concat` | String concatenation |
| `$cond` | Conditional/ternary |
| `$year`, `$month`, `$dayOfMonth` | Date extraction |
| `$toString` | Type casting |
| `$lt` | Less than comparison |

---

## 16. Sample Documents

### Sample User Document

```json
{
  "_id": "ObjectId('664a1b2c3d4e5f6a7b8c9d0e')",
  "name": "Vennela Jangiti",
  "email": "vennela@example.com",
  "password": "$2b$10$xK9j...(bcrypt hash)...Rq4m",
  "resumeText": "Vennela Jangiti | Software Engineer | React, Node.js, MongoDB, Python, Machine Learning...",
  "resumeFileName": "resume-664a1b2c-1714000000000.pdf",
  "resumeUploadedAt": "2026-04-20T10:30:00.000Z",
  "socialLinks": [
    {
      "id": "link-1",
      "platform": "GitHub",
      "title": "GitHub Profile",
      "url": "https://github.com/vennelajangiti17",
      "icon": "github"
    },
    {
      "id": "link-2",
      "platform": "LinkedIn",
      "title": "LinkedIn",
      "url": "https://linkedin.com/in/vennela",
      "icon": "linkedin"
    }
  ],
  "googleRefreshToken": "",
  "googleAccessToken": "",
  "googleTokenExpiry": 0,
  "profilePhoto": "http://localhost:5000/uploads/profile/profile-664a1b2c-1714000000000.jpg",
  "createdAt": "2026-04-15T08:00:00.000Z",
  "updatedAt": "2026-04-22T14:30:00.000Z"
}
```

### Sample Job Document

```json
{
  "_id": "ObjectId('665b2c3d4e5f6a7b8c9d1e2f')",
  "userId": "ObjectId('664a1b2c3d4e5f6a7b8c9d0e')",
  "title": "Software Engineer, Frontend",
  "company": "Google",
  "url": "https://careers.google.com/jobs/12345",
  "description": "Google is looking for a Frontend Engineer to build beautiful, accessible web experiences using React and TypeScript. You will work on large-scale products used by billions.",
  "status": "Applied",
  "matchScore": 78,
  "skills": {
    "all": ["React", "TypeScript", "JavaScript", "CSS", "GraphQL", "System Design"],
    "matched": ["React", "TypeScript", "JavaScript", "CSS"],
    "missing": ["GraphQL", "System Design"]
  },
  "postedDate": "3 days ago",
  "location": "Mountain View, CA",
  "salary": "$150,000 - $200,000",
  "category": "Jobs",
  "deadline": "2026-05-15T23:59:00.000Z",
  "rejectionReason": "Not specified",
  "appliedDate": "2026-04-20T12:00:00.000Z",
  "history": [
    { "status": "Saved", "date": "2026-04-18T10:00:00.000Z" },
    { "status": "Applied", "date": "2026-04-20T12:00:00.000Z" }
  ],
  "contacts": {
    "recruiterName": "Jane Smith",
    "hiringManager": "John Doe"
  },
  "notes": "Had a referral from college alumni. Follow up next week.",
  "createdAt": "2026-04-18T10:00:00.000Z",
  "updatedAt": "2026-04-20T12:00:00.000Z"
}
```

### Sample Settings Document

```json
{
  "_id": "ObjectId('666c3d4e5f6a7b8c9d2e3f40')",
  "userId": "ObjectId('664a1b2c3d4e5f6a7b8c9d0e')",
  "notifications": {
    "followUpReminders": true,
    "deadlineAlerts": true,
    "interviewReminders": true,
    "notificationsEnabled": true,
    "remindersEnabled": true,
    "browserNotifications": true,
    "notificationTiming": "1day",
    "customReminderHours": 6
  },
  "preferences": {
    "defaultStatus": "Saved",
    "defaultTags": ["Remote", "Internship", "Urgent"],
    "duplicateDetection": true,
    "autoTagging": false
  },
  "appearance": {
    "theme": "dark",
    "accentStyle": "gold",
    "cardLayout": "comfortable"
  },
  "privacy": {
    "securityActivityAlerts": true,
    "profileDiscoverability": false
  },
  "createdAt": "2026-04-15T08:00:00.000Z",
  "updatedAt": "2026-04-22T16:00:00.000Z"
}
```

### Sample CalendarEvent Document

```json
{
  "_id": "ObjectId('667d4e5f6a7b8c9d3e4f5061')",
  "title": "Google - Software Engineer, Frontend",
  "description": "Role: Software Engineer, Frontend\nCompany: Google\nLink: https://careers.google.com/jobs/12345",
  "date": "2026-05-15T23:59:00.000Z",
  "startTime": "",
  "endTime": "11:59 PM",
  "type": "deadline",
  "status": "pending",
  "location": "Mountain View, CA",
  "applyLink": "https://careers.google.com/jobs/12345",
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "googleEventId": "",
  "source": "dashboard",
  "sourceId": "dashboard-job-665b2c3d4e5f6a7b8c9d1e2f",
  "createdAt": "2026-04-20T14:00:00.000Z",
  "updatedAt": "2026-04-20T14:00:00.000Z"
}
```

---

## 17. Common Viva Questions & Answers

### Q1: Why did you choose MongoDB over MySQL/PostgreSQL?

**A:** Our application scrapes job postings from many different websites, and each has different data. MongoDB's flexible schema lets us store variably-shaped documents without `ALTER TABLE`. Additionally, fields like `skills` (array of arrays), `history` (array of objects), `socialLinks` (embedded sub-documents), and `contacts` (nested object) map naturally to MongoDB documents. In SQL, these would require 5–6 separate tables with JOIN operations.

### Q2: How is your database connected to the application?

**A:** We use **Mongoose v9.5.0** as our ODM (Object-Document Mapper) to connect to **MongoDB Atlas** (cloud). The connection string is stored in a `.env` file as `MONGO_URI`. At server startup, `mongoose.connect(process.env.MONGO_URI)` establishes a connection pool (default 5 connections). If the connection fails, the server exits with `process.exit(1)`.

### Q3: How do you ensure data security?

**A:** Multiple layers:
1. **Passwords** are hashed with bcrypt (10 salt rounds) — never stored in plain text.
2. **JWT tokens** authenticate every request, expire after 7 days.
3. **Every query** includes `userId` — users can only access their own data.
4. **Password hashes are never sent** to the frontend (`.select('-password')`).
5. **MongoDB Atlas** enforces TLS/SSL encryption in transit.
6. **Input validation** at both Mongoose schema level and application level.

### Q4: What are the relationships in your database?

**A:**
- **User → Jobs**: One-to-Many (one user can have many tracked opportunities)
- **User → Settings**: One-to-One (each user has exactly one settings document, enforced by unique index)
- **User → CalendarEvents**: One-to-Many (one user can have many calendar events)
- **Job → CalendarEvent**: Implicit link (calendar events with `source: 'dashboard'` reference a Job's `_id` via the `sourceId` field)

### Q5: What indexes did you create and why?

**A:** We created:
1. `{ userId: 1, status: 1, matchScore: -1 }` on Jobs — optimizes the dashboard's most common query pattern (fetch user's jobs grouped by status, sorted by match score).
2. `{ title: 'text', company: 'text' }` on Jobs — enables full-text search in the dashboard search bar.
3. `{ userId: 1 }` unique on Settings — enforces one settings document per user.
4. Multiple compound indexes on CalendarEvents for sync operations.
5. `{ email: 1 }` unique on Users — fast login lookups and prevents duplicate registrations.

### Q6: What is the aggregation pipeline and where do you use it?

**A:** The aggregation pipeline is MongoDB's framework for server-side data processing. We use it in 3 places:
1. **Trends**: `$match → $group (by date) → $sort → $project` — groups jobs by creation date to show daily application counts.
2. **Skill Gap**: `$match → $unwind → $match → $group → $sort → $limit → $project` — unwinds the `skills.missing` array to find the most commonly missing skills.
3. **Match Insights**: `$match → $facet` — runs 4 sub-pipelines in one query: average scores, interview averages, recent rejections, and recent offers.

### Q7: What is BSON and how is it different from JSON?

**A:** BSON (Binary JSON) is MongoDB's internal storage format. Key differences:
- BSON supports additional types not in JSON: `ObjectId`, `Date`, `int32`, `int64`, `Decimal128`, `Binary`.
- BSON is binary-encoded, making it faster to traverse and parse.
- BSON documents have a length prefix, so MongoDB can skip documents without parsing their contents.
- The `_id` field uses BSON `ObjectId` — a 12-byte value containing timestamp, machine identifier, process ID, and counter.

### Q8: What is `upsert` and where do you use it?

**A:** Upsert means "update if exists, insert if not." We use it in:
- **Settings**: `Settings.findOneAndUpdate({ userId }, { $set: data }, { upsert: true })` — creates the settings document on first access, updates it later.
- **Calendar sync**: `CalendarEvent.findOneAndUpdate({ userId, source, sourceId }, data, { upsert: true })` — creates a calendar reminder for a job deadline if one doesn't exist, or updates the existing one.

### Q9: How do you handle cascading deletes?

**A:** When a user deletes their account, we use `Promise.all()` to delete both the user document AND all their jobs in parallel:
```javascript
await Promise.all([
  Job.deleteMany({ userId }),
  User.findByIdAndDelete(userId)
]);
```
This is application-level cascading — MongoDB does not have native foreign key constraints or cascading deletes like SQL databases.

### Q10: What is the `$text` operator?

**A:** `$text` performs a language-aware text search on fields with a text index. When a user types "Google Engineer" in the dashboard search bar, MongoDB tokenizes this into ["google", "engineer"], stems the words, removes stop words, and looks them up in the text index built on `title` and `company` fields. Documents matching ANY search term are returned.

### Q11: What happens if MongoDB Atlas goes down?

**A:** Atlas provides automatic failover with its replica set architecture. If the primary node fails, a secondary node is elected as the new primary within seconds. For our application, if the initial connection fails at startup, `process.exit(1)` stops the server. If the connection drops mid-operation, Mongoose automatically reconnects.

### Q12: How is data transferred from frontend to database?

**A:**
1. **Frontend** (React) calls the backend API using `fetch()` with JSON body + JWT token in the `Authorization` header.
2. **Express Router** matches the URL to a route handler.
3. **Auth Middleware** validates the JWT and attaches `req.user.id`.
4. **Controller** receives the request, runs Mongoose queries against MongoDB.
5. **Mongoose** translates the JavaScript query into a MongoDB wire protocol command.
6. **MongoDB Atlas** executes the query and returns BSON results.
7. **Mongoose** converts BSON back to JavaScript objects.
8. **Controller** sends the JSON response back to the frontend.

### Q13: What is the `timestamps: true` option in Mongoose schemas?

**A:** When `timestamps: true` is set, Mongoose automatically manages two fields: `createdAt` (set once on document creation) and `updatedAt` (updated every time the document is modified). We don't need to manually manage these fields.

### Q14: How are ObjectIds generated?

**A:** MongoDB's `ObjectId` is a 12-byte BSON type composed of:
- **4 bytes**: Unix timestamp (seconds since epoch)
- **5 bytes**: Random value (unique per machine/process)
- **3 bytes**: Incrementing counter (starts from a random value)

This design ensures ObjectIds are globally unique without requiring a central authority, and they're roughly sortable by creation time.

### Q15: What is Mongoose middleware and do you use it?

**A:** Mongoose middleware (hooks) are functions executed before or after certain operations (save, validate, remove). We rely on the built-in `timestamps` middleware (auto-manages `createdAt`/`updatedAt`). We also use `user.save()` instead of `findByIdAndUpdate()` in some places (like password changes) to trigger Mongoose validation.

---

<p align="center">
  <img src="mirae-logo.svg" alt="Mirae" width="40" />
  <br />
  <em>Complete DBMS reference for the Mirae Career Command Center.</em>
</p>
