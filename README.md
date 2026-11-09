<div align="center">

# 🇪🇹 Ethiopia Travel Journal

**A full-stack, production-grade travel publishing platform built with Next.js 16, Payload CMS 3, MongoDB, and Cloudinary — crafted to showcase the stories, destinations, and culture of Ethiopia.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![Payload CMS](https://img.shields.io/badge/Payload_CMS-3.91-blueviolet?logo=payload)](https://payloadcms.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🌐 Live Demo](https://ethiopia-travel-journal.vercel.app/) · [Admin Panel](https://ethiopia-travel-journal.vercel.app/admin) · [Report a Bug](#)

</div>

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture Highlights](#-architecture-highlights)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Author](#-author)

---

## 🌍 About the Project

**Ethiopia Travel Journal** is a production-ready, full-stack content platform for sharing travel stories, cultural insights, and destination guides across Ethiopia. It features a **custom headless CMS admin panel**, **multilingual support (English & Amharic)**, a **newsletter system with double opt-in**, **cloud media management**, and sophisticated **engagement tracking** — all built from scratch as a showcase of modern full-stack engineering.

> This project was built entirely from the ground up as a **portfolio project** to demonstrate real-world software engineering skills: system architecture, security design, API engineering, testing strategy, and production deployment readiness.

---

## ✨ Key Features

### 📰 Content Publishing
- Rich-text article editor powered by **Lexical** (block-based, extensible)
- **Image Gallery** and **Visual Media Layout** custom blocks with a drag-and-drop layout engine
- **Slug-based routing** with SEO-optimized article and destination pages
- Article versioning & draft/publish workflow via Payload CMS

### 🌐 Multilingual Support
- Full **English & Amharic (አማርኛ)** localization in both the admin UI and the public site
- Custom Amharic translations for the Lexical editor slash-menu and toolbar commands
- Locale-aware URL routing (`?locale=en` / `?locale=am`)

### 📬 Newsletter System
- **Double opt-in** flow: subscribe → email confirmation → confirmed subscriber
- Broadcast system with delivery tracking (`NewsletterBroadcasts` + `NewsletterDeliveries`)
- One-click unsubscribe with signed token verification
- Transactional email via **Nodemailer** with branded HTML templates

### 📊 Engagement & Analytics
- **Privacy-preserving view tracking**: HMAC-SHA-256 signed visitor tokens (no raw IPs stored)
- **Race-safe 24-hour view deduplication** using MongoDB compound unique indexes
- **Engagement score** algorithm: `ln(1 + views) + w × ln(1 + comments)` for popularity ranking
- Real-time engagement dashboard with charts (Recharts), stat cards, and publishing trends

### 💬 Comment System
- Moderated comments with `pending → approved / rejected` workflow
- Server-side rate limiting (5 req/min per IP/session)
- Honeypot bot trap for spam prevention
- Field-level access control — commenter emails are never exposed to the public

### 🖼️ Media Management
- **Cloudinary** cloud storage integration with automatic fallback to local storage
- Image optimization via **Sharp**
- Custom **Media Editor Enhancer** in the Payload admin panel

### 🔒 Security & Access Control
- Role-based access: `admin` and `editor` roles with Payload field-level and collection-level rules
- Draft/preview isolation — no view tracking or public comments on unpublished content
- Bot/crawler detection to prevent inflated analytics

### 🎨 Admin Panel Customizations
- Custom branded sidebar, logo, and nav icons
- Custom analytics **Dashboard** with Recharts publishing chart, region breakdown, and stat cards
- Custom after-login welcome message and theme toggle

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19) |
| **CMS** | Payload CMS 3.91 (code-first, headless) |
| **Database** | MongoDB via Mongoose Adapter |
| **Language** | TypeScript 5.7 (strict) |
| **Styling** | Tailwind CSS 4, custom SCSS |
| **Rich Text** | Lexical Editor (custom blocks & features) |
| **Media Storage** | Cloudinary (with local fallback via Sharp) |
| **Email** | Nodemailer with custom HTML templates |
| **Charts** | Recharts |
| **UI Primitives** | Radix UI, Lucide React, CVA |
| **Testing** | Vitest (unit & integration) + Playwright (E2E) |
| **Linting** | ESLint 9, Prettier |
| **Package Manager** | npm |

---

## 🏗️ Architecture Highlights

### Engagement & View Deduplication

The platform uses a **cryptographically-signed, privacy-first visitor identification** system:

```
Visitor Cookie (etj_vid):  <UUIDv4>.<HMAC-SHA256-Signature>
Database Storage:           SHA-256(visitorId ∥ secret)   ← one-way hash, no PII stored
```

View deduplication is **race-safe under concurrent traffic** via a MongoDB compound unique index:

```
viewKey = articleId + "_" + visitorHash + "_" + dayBucket
dayBucket = ⌊ Date.now() / 86_400_000 ⌋
```

If two identical requests arrive simultaneously, MongoDB atomically rejects the duplicate with error `11000`, guaranteeing exactly-once counting across a multi-instance deployment.

### Engagement Score Formula

```
engagementScore = ln(1 + viewCount) + w_comment × ln(1 + commentCount)
```

Default comment weight is `3` (configurable via `ENGAGEMENT_COMMENT_WEIGHT`). Scores are stored to 4 decimal places for deterministic sorting.

### Newsletter Architecture

```
POST /api/newsletter/subscribe
  → Creates Subscriber (status: pending)
  → Sends confirmation email with signed token

GET /api/newsletter/confirm?token=<signed>
  → Validates token → sets status: confirmed

POST /api/newsletter/unsubscribe
  → Validates token → sets status: unsubscribed
```

---

## 📁 Project Structure

```
ethiopia-travel-journal/
├── src/
│   ├── app/
│   │   ├── (frontend)/           # Public-facing site (Next.js App Router)
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── stories/          # Stories listing & detail pages
│   │   │   ├── destinations/     # Destinations listing & detail pages
│   │   │   └── newsletter/       # Confirm & unsubscribe pages
│   │   └── (payload)/
│   │       └── admin/            # Payload CMS admin panel
│   ├── collections/              # Payload collection schemas
│   │   ├── Articles.ts
│   │   ├── Destinations.ts
│   │   ├── Comments.ts
│   │   ├── Subscribers.ts
│   │   ├── NewsletterBroadcasts.ts
│   │   ├── NewsletterDeliveries.ts
│   │   ├── ArticleViews.ts
│   │   ├── Advertisements.ts
│   │   ├── Categories.ts
│   │   ├── Media.ts
│   │   └── Users.ts
│   ├── components/
│   │   ├── admin/                # Custom admin dashboard, nav, sidebar
│   │   ├── site/                 # Public site components
│   │   ├── lexical/              # Custom Lexical editor blocks
│   │   └── richText/             # Rich text renderers
│   ├── endpoints/                # Custom Payload REST endpoints
│   │   ├── newsletterSubscribe.ts
│   │   ├── newsletterConfirm.ts
│   │   ├── newsletterUnsubscribe.ts
│   │   ├── storyTrackView.ts
│   │   └── storyComments.ts
│   ├── lib/
│   │   ├── site/                 # Data fetching utilities
│   │   │   ├── engagement.ts     # View tracking & engagement score logic
│   │   │   ├── stories.ts
│   │   │   └── destinations.ts
│   │   ├── email/                # Email adapter & branded templates
│   │   ├── media/                # Cloudinary adapter
│   │   ├── newsletter/           # Queue logic
│   │   └── dashboard/            # Admin dashboard data aggregation
│   ├── blocks/                   # Custom Payload/Lexical blocks
│   │   ├── ImageGallery.ts
│   │   └── VisualMediaLayout.ts
│   ├── hooks/                    # Payload lifecycle hooks
│   ├── i18n/                     # Amharic translations
│   └── payload.config.ts         # Central Payload CMS configuration
├── tests/                        # Vitest unit & integration tests
├── playwright.config.ts          # Playwright E2E test configuration
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.18.1 (npm is included)
- **MongoDB** (local instance or MongoDB Atlas connection string)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ethiopia-travel-journal.git
cd ethiopia-travel-journal

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# 4. Seed an initial admin user
npm run seed:user

# 5. Start the development server
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# ─── Database ───────────────────────────────────────────────────────────
DATABASE_URL=mongodb://localhost:27017/ethiopia-travel-journal

# ─── Payload CMS ────────────────────────────────────────────────────────
PAYLOAD_SECRET=your-strong-random-secret-key

# ─── Application URL ────────────────────────────────────────────────────
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# ─── Cloudinary (optional — falls back to local storage if unset) ───────
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ─── Email / SMTP (Nodemailer) ──────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=Ethiopia Travel Journal <noreply@example.com>

# ─── Engagement ─────────────────────────────────────────────────────────
ENGAGEMENT_COMMENT_WEIGHT=3   # Optional, default: 3
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run devsafe` | Clear `.next` cache and start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests (unit, integration, E2E) |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:integration` | Run Vitest integration tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run seed:user` | Seed a default admin user |
| `npm run seed:production` | Seed production-ready content |
| `npm run generate:types` | Regenerate Payload TypeScript types |
| `npm run generate:importmap` | Regenerate Payload import map |

---

## 🧪 Testing

The project has a multi-layered testing strategy:

### Unit & Integration Tests (Vitest)
```bash
npm run test:unit           # Fast, isolated unit tests
npm run test:integration    # Tests against a real MongoDB instance
```

### End-to-End Tests (Playwright)
```bash
npm run test:e2e            # Full browser-based E2E tests
```

E2E tests cover:
- Article listing, filtering, and sorting (latest / popular)
- Newsletter subscribe → confirm → unsubscribe flow
- Comment submission and moderation workflow
- Destination browsing with region filtering
- Visual Media Layout block interactions

---

## ☁️ Deployment

### Production Build

```bash
npm run build
npm start
```

### Recommended Deployment Stack

| Service | Purpose |
|---|---|
| **Vercel** / **Railway** | Next.js application hosting |
| **MongoDB Atlas** | Managed MongoDB database |
| **Cloudinary** | Media storage & optimization |
| **SendGrid** / **Resend** | Transactional email delivery |

### Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 👤 Author

**Mebrat Matebie**

> Full-Stack Developer passionate about building production-grade web applications with modern tooling. This project demonstrates end-to-end ownership of a real-world product — from database schema design and API security to custom CMS extensions, analytics, and E2E test coverage.

- 📧 maytotmat@gmail.com
- 💼 [LinkedIn](#)
- 🐙 [GitHub](#)
- 🌐 [Portfolio](#)

---

<div align="center">

**© 2026 Ethiopia Travel Journal — Built with ❤️ by Mebrat Matebie**

*Powered by [Payload CMS](https://payloadcms.com) · [Next.js](https://nextjs.org) · [MongoDB](https://mongodb.com)*

</div>
