# Aegis Secure Grant Management Portal

A secure, multi-role enterprise web application for managing grant applications. Built using the **Model-View-Controller (MVC)** architectural pattern, enforcing strict **Role-Based Access Control (RBAC)**, supporting dual authentication (**Local JWT + OAuth 2.0**), and fully containerized with **Docker Compose** across three microservices: **Application**, **PostgreSQL**, and **Redis**.

---

## Architecture & System Design

```
                     ┌────────────────────────────────────────────────────────┐
                     │                      User Browser                      │
                     └──────┬──────────────────────┬──────────────────▲───────┘
     1. Login / Register    │                      │ 7. API with JWT  │
                            ▼                      ▼                  │
                   ┌─────────────────┐    ┌─────────────────┐         │ 6. Issues JWT
                   │ External OAuth  │    │  RBAC Middleware│         │
                   │ (Google OAuth2) │    └────────┬────────┘         │
                   └────────┬────────┘             │ Validates Role   │
          2-5. Token Exch.  │                      ▼                  │
                            │             ┌─────────────────┐         │
                            └────────────►│   Controllers   ├─────────┘
                                          └────────┬────────┘
                                                   ▼
                                          ┌─────────────────┐
                                          │  Service Layer  │
                                          └────┬────────┬───┘
                                               │        │
                                Data Ops       ▼        ▼ Cache Ops
                                     ┌───────────┐   ┌─────────┐
                                     │PostgreSQL │   │  Redis  │
                                     │ Database  │   │  Cache  │
                                     └─────┬─────┘   └─────────┘
                                           ▼
                                    [DB Data Volume]
```

### Roles & Permission Matrix

| Role | Browse Grants | Create Grants | Edit / Delete Own Grants | Delete Any Grant | Submit Proposal | View Grant Applications | View Own Application | Assign Roles |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **GRANTEE** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| **GRANTOR** | ✅ | ✅ | ✅ (Owner only) | ❌ | ❌ | ✅ (Owner only) | ❌ | ❌ |
| **ADMIN**   | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## Core Features
1. **Containerized Multi-Service Orchestration**:
   - `app`: Node.js/Express MVC backend serving the API and interactive web interface.
   - `db`: PostgreSQL with relational integrity, foreign keys, and volume persistence.
   - `cache`: Redis caching layer with seamless fallback.
   - Full service health checks with startup dependencies (`condition: service_healthy`).
2. **Auto-Seeding Mechanism**:
   - On container boot, migrations seed initial roles (`ADMIN`, `GRANTOR`, `GRANTEE`) and a default Administrator account (`admin@grantportal.io` / `AdminPassword123!`).
3. **Role-Based Access Control (RBAC)**:
   - Centralized RBAC middleware checking cryptographically signed JWT claims (`userId`, `roles`).
   - Granular ownership verification ensuring grantors only manage their own grants and review submissions to their grants.
   - Admin-exclusive user role promotion endpoint (`POST /api/users/:userId/roles`).
4. **OAuth 2.0 & Local Authentication**:
   - Standard email/password registration with bcrypt password hashing and default `GRANTEE` assignment.
   - Google OAuth 2.0 flow (`GET /api/auth/google` and `GET /api/auth/google/callback`) with server-side authorization code exchange and user auto-provisioning.
5. **Interactive Single-Page Portal UI**:
   - Dark-mode glassmorphic UI with quick demo-account switchers for evaluation, real-time JWT token claim inspector, proposal submission modals, and application review workflows.
6. **Extensive Test Coverage**:
   - Automated unit and integration test suite achieving **> 83% statement coverage** across all models, controllers, services, middlewares, and routes.

---

## Quick Start with Docker Compose

### Prerequisites
- [Docker Engine & Docker Compose](https://docs.docker.com/get-docker/)

### 1. Clone & Configure Environment
```bash
cp .env.example .env
```

### 2. Build and Start Services
```bash
docker compose up --build -d
```

### 3. Verify Container Status & Health
```bash
docker compose ps
```
All three containers (`grant_portal_app`, `grant_portal_db`, `grant_portal_cache`) will transition to `healthy`.

### 4. Access the Application
- **Web UI & Portal**: [http://localhost:3000](http://localhost:3000)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

### Default Admin Credentials
- **Email**: `admin@grantportal.io`
- **Password**: `AdminPassword123!`

---

## Running Locally Without Docker

### Prerequisites
- Node.js >= 20.x
- PostgreSQL instance (or use mock/test DB)
- Redis (optional, in-memory fallback enabled)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests & Generate Code Coverage
```bash
npm run test:coverage
```
The Jest test runner will execute all 44 test cases and generate HTML and JSON coverage reports in `coverage/`.

### 3. Run Development Server
```bash
npm run dev
```

---

## API Contract Specification

### Authentication
- `POST /api/auth/register`: Create user account (default role: `GRANTEE`).
  - Request: `{ "name": "...", "email": "...", "password": "..." }`
  - Response (201): `{ "id": "...", "name": "...", "email": "..." }`
- `POST /api/auth/login`: Authenticate with email/password.
  - Request: `{ "email": "...", "password": "..." }`
  - Response (200): `{ "accessToken": "<jwt>" }`
- `GET /api/auth/google`: Redirect to Google OAuth consent screen.
- `GET /api/auth/google/callback?code=...`: Exchange code for JWT.
- `GET /api/auth/me`: Retrieve current user profile and assigned roles (Bearer Token required).

### RBAC Governance (ADMIN)
- `POST /api/users/:userId/roles`: Assign a role (`ADMIN`, `GRANTOR`, `GRANTEE`) to a user.
  - Required Header: `Authorization: Bearer <ADMIN_TOKEN>`
  - Request: `{ "roleName": "GRANTOR" }`
  - Response (200): `{ "message": "...", "user": { ... } }`
- `GET /api/users`: List all users and their roles (ADMIN only).

### Grant Management
- `POST /api/grants`: Create a grant (GRANTOR only).
  - Request: `{ "title": "...", "description": "...", "amount": 50000 }`
  - Response (201): Created grant object with `grantor_id` automatically assigned.
- `GET /api/grants`: List all grants (GRANTEE, GRANTOR, ADMIN).
- `GET /api/grants/:id`: Get grant details.
- `PUT /api/grants/:id`: Update grant (Owner GRANTOR only; returns 403 for other grantors).
- `DELETE /api/grants/:id`: Delete grant (Owner GRANTOR or ADMIN).

### Application Management
- `POST /api/grants/:grantId/apply`: Submit proposal (GRANTEE only).
  - Request: `{ "proposal": "..." }`
  - Response (201): Application object with status `submitted`.
- `GET /api/grants/:grantId/applications`: View all applications for a grant (Owner GRANTOR only).
- `GET /api/applications/:appId`: View single application (Submitting GRANTEE or parent GRANTOR).
- `PATCH /api/applications/:appId/status`: Update status (`submitted`, `under_review`, `approved`, `rejected`) (Parent GRANTOR only).
- `GET /api/applications/my`: View all applications submitted by the logged-in grantee.

---

## Agile Planning & User Stories
For the complete Agile planning artifact, epics, user stories, and acceptance criteria, see [PROJECT_PLAN.md](PROJECT_PLAN.md).
