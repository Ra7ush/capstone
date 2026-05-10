# NexusHub

## Table of Deliverables

**Authors:**
Meer Rahim Karim — Shadman Hamid Sidiq — Ibrahim Nzar

**Supervised by:**
Dr. Hemin Latif

**SE 491**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Team Members & Background](#team-members--background)
3. [Platform Architecture](#platform-architecture)
4. [Table of Deliverables](#table-of-deliverables-1)

---

## Introduction

Our platform named **"NexusHub"** is a full-stack Creator Economy Platform that connects creators with learners, building vibrant communities around knowledge sharing and skill development. The general features of the project are:

- **Online Courses/Services** — Creators can publish structured courses with modules, lessons, and resources
- **Community System** — Public and private communities where users share posts, comments, and interact
- **Messaging & Mentorship** — Real-time direct messaging with Instagram-style message requests
- **AI-Powered Features** — Smart recommendations, AI chat tutor, content summarization, and smart search
- **Creator Verification & Ratings** — Trust system with creator verification and user reviews

There are many already existing online platforms such as Coursera, Udemy, and Teachable, but what distinguishes NexusHub is its unified ecosystem combining course creation, community building, direct messaging, and AI-assisted learning—all in one platform with dedicated mobile and admin interfaces.

---

## Team Members & Background

Our team is composed of three members:

- **Meer Rahim Karim**
- **Shadman Hamid Sidiq**
- **Ibrahim Nzar**

We work collaboratively across all parts of the system (mobile, backend, and admin panel), with tasks shared among all members to maximize learning and cross-component understanding. All members possess fundamental skills in programming, networking, and databases. The team collectively works with React Native (Expo), Node.js (Express), React (Vite), Supabase, and Redis.

---

## Platform Architecture

Our platform is composed of three main components sharing a single Supabase (PostgreSQL) database:

1. **Mobile App ("NexusHub")** — Built with React Native + Expo (TypeScript), for both regular users and creators. Features file-based routing, React Query state management, and NativeWind styling.
2. **Admin Dashboard ("NexusHub Admin")** — Built with React + Vite, for platform administrators to manage users, verify creators, moderate content, and monitor system health.
3. **Backend API** — Built with Node.js + Express, providing RESTful APIs with Redis caching, Helmet security, rate limiting, Winston logging, and Zod validation.

---

## Table of Deliverables

This table contains an extensive list of all the features of our platform. **Time: 30 Weeks** divided with the team — each member works **10 weeks in parallel**.

We will use:

- 🔵 **Blue** for features related to the **Mobile App**
- 🟢 **Green** for features related to the **Admin Dashboard**
- 🟠 **Orange** for features related to the **Backend** or shared across components

---

### Week 1–2

| Feature                                     | Significance / User                                                                                                       | Significance / Us                                                                                                                                                                                    | Technical Skills / Preparations                                                                                                                                                                                                                                                                                 | Time   | Members |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| 🟠 **Backend — Authentication & Security**  | Users, creators, and admins can sign up and log in securely. JWT-based authentication protects all API endpoints.         | Learn JWT token management, Supabase Auth SDK integration, and Express.js middleware patterns. Learn Zod schema validation for request payloads. Learn rate limiting and Helmet.js security headers. | 1. Study Supabase Auth documentation and JWT verification flow.<br>2. Review express-rate-limit and Helmet.js documentation.<br>3. Set up Zod validation schemas for auth endpoints.<br>4. Design the database schema for role-based access control.                                                            | 1 Week | Meer    |
| 🟢 **Admin — Authentication**               | Admins can log in securely to access the dashboard.                                                                       | Learn Supabase Auth for admin role, protected routing.                                                                                                                                               | 1. Study Supabase Auth documentation for role-based access.<br>2. Research React protected routing patterns.<br>3. Design admin login page mockup.                                                                                                                                                              | 1 Week | Meer    |
| 🟠 **Backend — User Profiles**              | Users can create, view, update, and delete their profiles. Profile search allows discovering other users.                 | Learn Supabase Storage API for file uploads. Learn RESTful CRUD endpoint design with Express.js. Understanding PostgreSQL query filtering and search implementation.                                 | 1. Study Supabase Storage documentation for image upload handling.<br>2. Design database schema for user profiles (bio, avatar, social links, portfolio URL, privacy settings).<br>3. Research RESTful API design best practices for CRUD operations.<br>4. Set up query filtering patterns for profile search. | 1 Week | Shadman |
| 🟠 **Backend — Creator System**             | Creators can apply for verification, manage their profiles, and track statistics (ratings, followers, community members). | Learn PostgreSQL database triggers for auto-calculating rating averages. Learn data aggregation queries across multiple tables.                                                                      | 1. Backend skills: file handling for verification documents, creator stats aggregation, rating system with database triggers.                                                                                                                                                                                   | 1 Week | Shadman |
| 🔵 **Mobile — Authentication & Onboarding** | Users can register, verify email via OTP Resend API, complete onboarding with profile setup.                              | - Technical Skills: Learn Expo SecureStore for token storage, and OTP verification flow.<br>- Learn to design a smooth onboarding experience that guides new users.                                  | 1. Research OTP and TOTP authentication flow design.<br>2. Design onboarding screen mockups (sign-up, OTP verify, profile setup).<br>3. Research Expo Router file-based navigation for auth flows.                                                                                                              | 1 Week | Ibrahim |
| 🔵 **Mobile — User Profiles**               | Users can view and edit their profile, see their posts, and visit other users' profiles with follow/block options.        | Learn image picking (expo-image-picker), form handling, optimistic UI updates with React Query.                                                                                                      | 1. Study expo-image-picker documentation.<br>2. Research profile UI design patterns from Instagram and X (Twitter).<br>3. Research React Query optimistic update patterns for profile edits.                                                                                                                    | 1 Week | Ibrahim |

---

### Week 3–4

| Feature                              | Significance / User                                                                                                                   | Significance / Us                                                                                                                                                                                                                          | Technical Skills / Preparations                                                                                                                                                                                                                                            | Time    | Members |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| 🟢 **Admin — Creator Verifications** | Admins can review, approve, or reject creator verification applications.                                                              | Learn verification workflow design, document review UI.                                                                                                                                                                                    | 1. Do research on verification panels used by YouTube Partner Program and Stripe Connect.<br>2. Analyze how existing platforms handle document review workflows.                                                                                                           | 1 Week  | Meer    |
| 🟠 **Backend — Notifications**       | Users receive notifications for follows, likes, comments, and community activity. Supports unread count tracking and bulk operations. | Learn notification system database design with read/unread tracking.                                                                                                                                                                       | 1. Design notification database table with read/unread state.<br>2. Research efficient bulk operation patterns (mark all read, clear all).                                                                                                                                 | 1 Week  | Meer    |
| 🟠 **Backend — Services/Courses**    | Creators can create structured courses with modules, lessons, and downloadable resources. Supports draft/published states.            | Learn hierarchical database design (services → modules → lessons → resources). Learn race condition prevention with unique constraints. Learn draft/publish state machine patterns. Learn subscription tier enforcement in API middleware. | 1. Design hierarchical database schema for services, modules, lessons, and resources.<br>2. Research order indexing strategies with race condition prevention.<br>3. Plan draft/publish state machine transitions.<br>4. Study subscription-based access control patterns. | 2 Weeks | Shadman |
| 🔵 **Mobile — Creator Dashboard**    | Verified creators have a dedicated dashboard with stats (Growth Sync), quick actions, and recent activity feed.                       | Learn dashboard design patterns, data visualization, dynamic stat cards.                                                                                                                                                                   | 1. Research creator dashboard designs from platforms like YouTube Studio and Teachable.<br>2. Design Growth Sync stat cards and dashboard layout mockups.<br>3. Design multi-step verification application form mockup.                                                    | 2 Weeks | Ibrahim |

---

### Week 5–6

| Feature                            | Significance / User                                                                                                                                                         | Significance / Us                                                                                          | Technical Skills / Preparations                                                                                                                                                                                                   | Time    | Members |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| 🟠 **Backend — AI Features**       | AI-powered recommendations, chat tutor, course description generation, smart search, and content summarization using OpenAI.                                                | Learn OpenAI API integration, prompt engineering, context-aware AI responses.                              | 1. Study OpenAI API documentation and API key management.<br>2. Research prompt engineering for context-aware AI responses.                                                                                                       | 1 Week  | Meer    |
| 🟠 **Backend — Reviews & Ratings** | Users can review and rate services after purchase. Supports review stats aggregation per service.                                                                           | Review validation, rating aggregation, one-review-per-user enforcement.                                    | 1. Design review database schema with unique constraints per user per service.<br>2. Research rating aggregation queries (average, distribution).                                                                                 | 1 Week  | Meer    |
| 🟠 **Backend — Community System**  | Users can create/join communities (public or private), post content, comment, and like. Private communities use a join request system.                                      | Learn relational database design for communities, posts, comments, likes, and memberships.                 | Database design: communities, posts, comments, likes, memberships, join requests.                                                                                                                                                 | 2 Weeks | Shadman |
| 🔵 **Mobile — Services/Courses**   | Users can browse courses by category, view course details with modules/lessons, purchase courses, and learn with a video player. Creators can create/manage their services. | Learn video player integration in React Native. Learn complex multi-step form wizard for service creation. | 1. Research video player libraries for React Native lesson playback.<br>2. Design course listing and detail page mockups with module breakdown.<br>3. Design service creation wizard mockup (title, modules, lessons, resources). | 1 Week  | Ibrahim |
| 🔵 **Mobile — Notifications**      | Users can view a notification feed, mark notifications as read, and navigate to related content.                                                                            | Learn notification UI patterns, badge indicators.                                                          | 1. Research notification UI patterns from Instagram and Twitter.<br>2. Design notification feed mockup with read/unread states.                                                                                                   | 1 Week  | Ibrahim |

---

### Week 7–8

| Feature                                | Significance / User                                                                                                                               | Significance / Us                                                                                                           | Technical Skills / Preparations                                                                                                                                                                           | Time    | Members |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- |
| 🔵 **Mobile — Messaging & AI Chat**    | Users can send direct messages, manage conversations, handle message requests, and chat with an AI tutor for learning assistance.                 | Learn chat UI design (message bubbles, timestamps, read indicators). Learn OpenAI API integration for building an AI tutor. | 1. Research chat UI patterns from WhatsApp and Instagram.<br>2. Design conversation list and chat screen mockups.<br>3. Study OpenAI API documentation for building context-aware chat tutor.             | 1 Week  | Meer    |
| 🟢 **Admin — User Management**         | Admins can view all users, search, filter by role, and manage user accounts.                                                                      | Learn data table design with search, filtering, and pagination.                                                             | 1. Do research on user management panels in Firebase Console and Stripe Dashboard.<br>2. Analyze how existing platforms handle user management.                                                           | 1 Week  | Meer    |
| 🟠 **Backend — Messaging System**      | Users can send direct messages, view conversations, and manage message requests. Supports message editing and deletion.                           | Learn conversation-based messaging database design.                                                                         | Real-time communication patterns, conversation management, message request workflow.                                                                                                                      | 1 Week  | Shadman |
| 🟠 **Backend — Follow & Block System** | Users can follow/unfollow creators, check follow status, and block/unblock other users. Suggested creators feature aids discovery.                | Learn social graph database design for follow and block relationships. Learn suggestion algorithm design.                   | 1. Design database schema for follow and block relationships.<br>2. Research suggestion algorithms based on user interests and activity.                                                                  | 1 Week  | Shadman |
| 🔵 **Mobile — Community**              | Users can discover and join communities, browse the community feed, create posts, comment, and interact. Creators manage their owned communities. | Learn feed design patterns, infinite scrolling, community privacy UX.                                                       | 1. Research feed design patterns from Reddit and Discord.<br>2. Design community discovery and feed screen mockups.<br>3. Study infinite scrolling and pull-to-refresh patterns in React Native FlatList. | 2 Weeks | Ibrahim |

---

### Week 9–10

| Feature                                  | Significance / User                                                                                        | Significance / Us                                                                                          | Technical Skills / Preparations                                                                                                          | Time   | Members |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- | -------------------------------------- |
| 🟠 **Backend — Moderation & Reports**    | Users can report inappropriate content or users. Reports are tracked for admin review.                     | Learn content moderation system design with report taxonomy. Learn anti-abuse patterns for report systems. | Content moderation design, report taxonomy (reason, content type).                                                                       | 1 Week | Meer    |
| 🟢 **Admin — Moderation**                | Admins can review reported content, take moderation actions, and manage platform safety.                   | Learn moderation workflow design, action logging.                                                          | 1. Do research on moderation tools used by Reddit and Discord.<br>2. Analyze how existing platforms handle content moderation workflows. | 1 Week | Meer    | _(combined with above)_                |
| 🟢 **Admin — Dashboard & Analytics**     | Admins can view platform-wide analytics including user growth, revenue, and system metrics.                | Learn data visualization with Recharts, KPI dashboard design.                                              | 1. Do research on analytics dashboards from Vercel and Shopify.<br>2. Study Recharts documentation for charts and graphs.                | 1 Week | Meer    | _(combined with Moderation = 2 weeks)_ |
| 🟠 **Backend — Subscription System**     | Creators can upgrade to Pro subscription for unlimited services. Free tier limited to 1 published service. | Learn subscription plan database design with tier-based limits. Learn middleware-level tier enforcement.   | 1. Design subscription tier database schema.<br>2. Research subscription enforcement patterns in API middleware.                         | 1 Week | Shadman |
| 🟠 **Backend — Infrastructure & DevOps** | Platform reliability through caching, logging, error handling, and database migrations.                    | Learn Redis caching strategies with ioredis. Learn Winston structured logging.                             | 1. Study ioredis documentation and Redis caching strategies.<br>2. Study Winston documentation for structured log configuration.         | 1 Week | Shadman |
| 🟠 **Backend — Purchases**               | Users can purchase premium services/courses. Purchase history tracking.                                    | Learn payment flow design and transaction recording. Learn purchase-based access control patterns.         | 1. Research payment flow design and transaction validation.<br>2. Design purchase database schema and history tracking.                  | 1 Week | Ibrahim |
| 🔵 **Mobile — Subscription Upgrade**     | Users/creators can view subscription plans and upgrade to Pro for premium features.                        | Learn subscription UI patterns, plan comparison design.                                                    | 1. Research pricing page designs from Spotify and YouTube Premium.<br>2. Design subscription upgrade page mockup with plan comparison.   | 1 Week | Ibrahim |

---

### Summary — 10-Week Parallel Schedule

| Week   | Meer (Admin + Auth + AI)              | Shadman (Backend Core)          | Ibrahim (Mobile App)           |
| ------ | ------------------------------------- | ------------------------------- | ------------------------------ |
| **1**  | Backend Auth & Security               | Backend User Profiles           | Mobile Auth & Onboarding       |
| **2**  | Admin Authentication                  | Backend Creator System          | Mobile User Profiles           |
| **3**  | Admin Creator Verifications           | Backend Services/Courses (1/2)  | Mobile Creator Dashboard (1/2) |
| **4**  | Backend Notifications                 | Backend Services/Courses (2/2)  | Mobile Creator Dashboard (2/2) |
| **5**  | Backend AI Features                   | Backend Community System (1/2)  | Mobile Services/Courses        |
| **6**  | Backend Reviews & Ratings             | Backend Community System (2/2)  | Mobile Notifications           |
| **7**  | Mobile Messaging & AI Chat            | Backend Messaging System        | Mobile Community (1/2)         |
| **8**  | Admin User Management                 | Backend Follow & Block          | Mobile Community (2/2)         |
| **9**  | Backend Moderation + Admin Moderation | Backend Subscription System     | Backend Purchases              |
| **10** | Admin Dashboard & Analytics           | Backend Infrastructure & DevOps | Mobile Subscription Upgrade    |

**Each member: 10 weeks → Total: 30 weeks of work completed in 10 calendar weeks**
