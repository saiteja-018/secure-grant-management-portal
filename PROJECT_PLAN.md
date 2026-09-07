# Project Plan: Secure Grant Management Portal

## Overview
The Secure Grant Management Portal is an enterprise-grade platform designed to streamline grant distribution and applications between Grantors (funding organizations) and Grantees (applicants), governed by platform Administrators. The platform enforces strict Role-Based Access Control (RBAC), multi-channel authentication (Local + OAuth 2.0), and a containerized microservice infrastructure using the Model-View-Controller (MVC) architecture.

---

## Epics & User Stories

### Epic 1: User Authentication & Identity Management

#### Story 1.1: Local Account Registration & Secure Login
**As a** prospective portal user (Grantee or Grantor),  
**I want to** register with my name, email, and password and log in to receive an authentication token,  
**So that** I can securely access the grant portal services tailored to my role.

**Acceptance Criteria:**
- [x] Given valid registration details (name, unique email, password), the system creates a new user account with hashed password storage, assigns the default role `GRANTEE`, and returns a `201 Created` status with user details (excluding the password hash).
- [x] Given valid credentials to `POST /api/auth/login`, the system verifies the password hash and returns an HTTP `200 OK` status with a signed JWT `accessToken`.
- [x] Given invalid credentials or non-existent email, the system rejects the request with an HTTP `401 Unauthorized` status and an informative error message.
- [x] The issued JWT payload contains the `userId`, an array of assigned `roles` (e.g. `["GRANTEE"]`), and standard `iat` and `exp` claims.

#### Story 1.2: Single Sign-On via OAuth 2.0 (Google)
**As a** user,  
**I want to** authenticate using my third-party Google account,  
**So that** I can securely sign in with one click without creating or remembering an additional password.

**Acceptance Criteria:**
- [x] Accessing `GET /api/auth/google` redirects the user's browser to the external Google OAuth 2.0 consent endpoint with configured `client_id`, `redirect_uri`, and `scope` (`openid email profile`).
- [x] When Google redirects to `GET /api/auth/google/callback` with an authorization code, the server securely exchanges the code for tokens, retrieves the user profile, and registers the user if they do not already exist (default role `GRANTEE`).
- [x] Upon completing the OAuth exchange, the server issues a valid JWT containing `userId` and `roles` allowing access to authenticated endpoints.

---

### Epic 2: Role-Based Access Control (RBAC) & Administration

#### Story 2.1: Granular Role Enforcement on Protected Routes
**As a** security officer,  
**I want** unauthorized and non-privileged requests to be immediately blocked by an RBAC middleware,  
**So that** sensitive grant operations and administrative resources cannot be accessed or manipulated by unauthorized users.

**Acceptance Criteria:**
- [x] Any request to a protected endpoint without a valid `Authorization: Bearer <token>` header returns an HTTP `401 Unauthorized` response.
- [x] Any request with a valid JWT whose user lacks the required role for that endpoint returns an HTTP `403 Forbidden` response.
- [x] The RBAC middleware extracts user claims from the token and injects `req.user` into the request lifecycle for downstream permission and ownership checks.

#### Story 2.2: Administrative Role Assignment
**As an** Administrator (`ADMIN`),  
**I want to** promote or assign additional roles (such as `GRANTOR`) to registered users via a dedicated endpoint,  
**So that** trusted organizations can be authorized to publish grant opportunities.

**Acceptance Criteria:**
- [x] Only users holding the `ADMIN` role can access `POST /api/users/:userId/roles`; attempts by `GRANTEE` or `GRANTOR` return `403 Forbidden`.
- [x] Upon submitting `{ "roleName": "GRANTOR" }`, the system adds the role to the user in the `user_roles` join table and returns an HTTP `200 OK` response.
- [x] Subsequent tokens issued or checked for the user reflect the newly granted permissions.

---

### Epic 3: Grant Opportunity Lifecycle Management

#### Story 3.1: Grant Creation by Authorized Grantors
**As a** Grantor (`GRANTOR`),  
**I want to** create and publish new grant opportunities with details such as title, description, and funding amount,  
**So that** eligible grantees can view and apply for funding.

**Acceptance Criteria:**
- [x] Only authenticated users with the `GRANTOR` role can create grants via `POST /api/grants`; non-grantors receive `403 Forbidden`.
- [x] The created grant automatically records the authenticated user's ID as `grantor_id` and returns an HTTP `201 Created` status with the complete grant object.

#### Story 3.2: Grant Modification and Ownership Protection
**As a** Grantor (`GRANTOR`),  
**I want to** update or delete grant opportunities that I created, while preventing other grantors from modifying my grants,  
**So that** funding terms remain accurate and under the creator's full control.

**Acceptance Criteria:**
- [x] Sending a `PUT /api/grants/:grantId` with updated fields succeeds with HTTP `200 OK` only if the authenticated user is the original creator (`grantor_id`).
- [x] A different `GRANTOR` attempting to update the grant receives an HTTP `403 Forbidden` response.
- [x] An `ADMIN` or the original `GRANTOR` can delete a grant via `DELETE /api/grants/:grantId`, returning HTTP `200 OK`.

---

### Epic 4: Grantee Application & Submission Tracking

#### Story 4.1: Grant Discovery and Application Submission
**As a** Grantee (`GRANTEE`),  
**I want to** browse available grant opportunities and submit detailed proposals,  
**So that** my organization can be evaluated for financial support.

**Acceptance Criteria:**
- [x] Authenticated users with roles (`GRANTEE`, `GRANTOR`, `ADMIN`) can retrieve all grants via `GET /api/grants` with HTTP `200 OK`.
- [x] A `GRANTEE` can submit a proposal via `POST /api/grants/:grantId/apply`, receiving an HTTP `201 Created` response containing the new application record with initial status `submitted`.
- [x] Non-grantees attempting to submit applications receive an HTTP `403 Forbidden` response.

#### Story 4.2: Application Review by Grant Owners
**As a** Grantor (`GRANTOR`),  
**I want to** review all applications submitted specifically for my grants,  
**So that** I can assess proposals and make funding decisions.

**Acceptance Criteria:**
- [x] A `GRANTOR` can retrieve submitted applications for their grant via `GET /api/grants/:grantId/applications`, returning HTTP `200 OK` with an array of application records.
- [x] A `GRANTOR` attempting to view applications for a grant owned by someone else receives an HTTP `403 Forbidden` response.
- [x] An applicant (`GRANTEE`) can view their individual submission details via `GET /api/applications/:appId`.

---

## Technical Constraints & Acceptance Baseline
- **Containerization**: Single-command orchestrator `docker compose up --build` brings up `app`, `db`, and `cache` services with mutual health checks.
- **Database Persistence**: Automatic schema migrations and seeding on startup with `ADMIN`, `GRANTOR`, and `GRANTEE` roles and initial admin user.
- **Test Coverage**: Minimum 70% statement coverage measured via standard Jest coverage reporter.
