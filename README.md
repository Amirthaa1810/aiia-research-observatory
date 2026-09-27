# AIIA Research Observatory

A full-stack clinical research demonstration workspace built with React, Vinext, Cloudflare Workers, D1 and R2.

## Implemented

- Individual ChatGPT sign-in through Sites, administrator-approved memberships, shared institutional records, and server-enforced role/study permissions.
- Persistent studies, participants, visits, sites, ethics submissions, safety cases, data queries, documents and monitoring tasks.
- Recruitment-readiness and participant-consent checks, duplicate detection, optimistic edit versioning, clinical-review requirements for safety closure, and reason-for-change capture.
- Dashboard KPIs computed from records, cumulative enrolment chart, configurable upcoming review window, role perspectives, search and status filters.
- Document uploads and authenticated downloads; append-only application audit events.
- CSV export, limited FHIR R4 sample bundles, and a draft CDISC mapping worksheet.
- Curated source-linked Research Sahayak retrieval, study-readiness explanations, and abstention for unmatched questions.
- Responsive layouts and accessible modal forms.

## Deployment scope

This is a synthetic-data demonstration, not a validated clinical system. Nine account roles are implemented: administrator, institutional head, researcher, doctor, research officer, ethics officer, safety officer, data manager, and participant. The host visitor allowlist and application approval are separate requirements. Staff study assignments and participant identity links must be approved by an administrator. India-only residency, independently immutable audit retention, malware scanning, formal electronic signatures, randomization, multilingual generative RAG, regulatory submission APIs and hospital/NPvCC integrations are not implemented. Do not enter real participant data.

Ethics decisions and uploaded evidence do not automatically activate a study. An authorized institutional process must verify readiness. Reporting dates are user-configured; no universal statutory deadline is implied.

## Local development

Use Node 22.13 or later. Install from package-lock.json using `npm ci`, generate migrations
using `npm run db:generate`, and build using `npm run build`. Start the development server
with `npm run dev`. Local sign-in uses a loopback-only synthetic identity; hosted sign-in is
dispatcher-owned. See `docs/openai-integration.md` for the optional Research Sahayak model
integration.

The D1 schema is maintained in db/schema.ts with versioned SQL migrations under drizzle/. Application requests use prepared statements. Record updates and audit inserts use atomic batches and matching version guards. Uploaded file bytes are stored in R2; file keys and metadata remain in D1.

## Validation performed

TypeScript validation and production build passed. Fifteen local integration checks cover anonymous access, persistent initialization, study creation, recruitment gating, consent gating, duplicate rejection, stale writes, safety review, query resolution, file upload/download and audit events. Browser checks cover sign-in, new-study save and reload, search, source-linked guidance, desktop/mobile layout, and valid/invalid WebMCP navigation.

## Team accounts

Each person signs in using their own ChatGPT account. There are no shared demo passwords or app-owned password accounts. The verified hosting owner bootstraps the administrator membership; the first visitor cannot claim ownership. Existing owner records are retained as the shared institutional workspace.

1. The owner adds the intended people to the private Site visitor allowlist.
2. Each person signs in, provides their name and requests a role.
3. An administrator opens Team access, verifies the person, assigns a role and studies, or links the correct participant record, then approves access with a reason.
4. Accounts route to role-specific pages. Participants have a separate read-only portal; the server exposes only their linked study, consent summary and own scheduled visits. Internal notes and other participant records are excluded.
5. Administrators can change roles/assignments or disable accounts. Each API and file request rechecks current membership. The owner and current account cannot be disabled or demoted through the team endpoint.

Institutional head accounts read the entire portfolio; staff roles are limited to assigned studies and permitted record types. Only administrators see the audit history and manage workspace settings. Only administrators verify study activation/registration fields. Site visitors still need app approval to access research data.

Twenty additional local access checks passed, covering anonymous and pending access, role/study filtering, participant field allowlisting, blocked privilege escalation, read-only leadership, file authorization, disabled accounts, stale membership updates and approval prerequisites. The participant approval dialog and mobile portal were checked in the browser. Local test identities are not deployed.

## Dedicated role pages and participant profiles

The home page is a portal selector. Every role has a /login/{role} entry page and /workspace/{role} workspace. Hosting still authenticates each person's personal ChatGPT account; selecting a different login page does not change their assigned role. Administrators can open clearly labelled read-only role previews generated from synthetic fixtures, with no production records passed to the preview.

Role dashboards now show clinical visit queues, research progress, officer review worklists, or institutional oversight. Participant cards have generated illustrative portraits, profile details, visit timelines and printable DEMO ID cards. Four synthetic portraits are reused and disclosed as illustrations. Authorized participant editors can upload JPG, PNG or WebP photos up to 3 MB; image storage remains private, photo reads recheck membership and study scope, and participant users can only fetch their own photo. Ordinary record updates cannot forge a photo storage key.

The extended fixture set has 248 participants, 198 visits, 15 document records and additional query/monitoring tasks. Administrators load the additive dataset once; stable IDs prevent duplicates and existing user records are preserved. Original sample participants are enriched with fictional profile fields only when matching the known demo identifiers and synthetic marker. This remains a synthetic-data prototype, not a validated clinical deployment.

Validation: TypeScript and production build; nine login routes and role previews; idempotent dataset expansion; photo upload/read restrictions; rejection of unsupported image files; participant isolation; blocked photo-key tampering; desktop/mobile profile and role-page checks.
