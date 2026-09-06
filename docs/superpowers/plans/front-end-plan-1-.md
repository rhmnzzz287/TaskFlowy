# TaskFlowy Front-End First Implementation Plan (front-end-plan-1-)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional, highly responsive, interactive Front-End for TaskFlowy with Mock/LocalStorage state management, including Authentication, Multi-Project Dashboard, Team Invite UI, Realtime Chat Drawer (cross-tab simulation), and Workspace Navigation, completely decoupled from the backend.

**Architecture:** A Service Abstraction Layer (`IAuthService`, `IProjectService`, `IChatService`) implemented with an in-memory/LocalStorage provider and browser `BroadcastChannel` for realtime tab-to-tab sync. UI views consume React Contexts (`AuthContext`, `ProjectContext`) without direct database coupling, allowing seamless backend swap to Supabase later with zero UI refactor.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, Zod (client validation), React Context + LocalStorage / BroadcastChannel.

**Spec Reference:** [`docs/superpowers/plans/planning-01.md`](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/docs/superpowers/plans/planning-01.md)

## Global Constraints

- **Decoupled Architecture:** No hardcoded Supabase queries in UI components; all operations route through `src/lib/services/`.
- **Anti-Slop Compliance:** No decorative non-semantic cards, no unformatted dates, clear keyboard navigation (Escape to close modals/drawers), proper contrast ratios, clear validation feedback.
- **Data Persistence:** Use `localStorage` key `taskflowy_mock_state_v1` with automatic seed fallback so developers/reviewers can test immediately without manual setup.
- **Cross-Tab Realtime:** Use `window.BroadcastChannel('taskflowy_chat_bus')` to simulate multi-user chat updates across different tabs in real-time.
- **Type Rigor:** Strict TypeScript types with 0 `any` usage.

---

### File Structure Map

```
frontend/src/
├── types/
│   ├── auth.ts              # User, Session, Login/Register DTOs
│   ├── project.ts           # Project, ProjectMember, Role, Invite types
│   └── chat.ts              # ChatMessage, PresenceUser types
├── lib/
│   ├── validation/
│   │   └── client-schemas.ts # Zod schemas for auth, project, invite forms
│   └── services/
│       ├── types.ts         # Service interfaces (IAuthService, IProjectService, IChatService)
│       ├── seed-data.ts     # Initial demo users, projects, tasks, chat messages
│       ├── mock-storage.ts  # LocalStorage wrapper & state helper
│       ├── auth-service.ts  # Mock authentication implementation
│       ├── project-service.ts # Mock project & membership implementation
│       ├── chat-service.ts  # Mock chat & BroadcastChannel sync implementation
│       └── index.ts         # Service factory exports
├── contexts/
│   ├── auth-context.tsx     # Global Auth Provider (user, login, logout, register)
│   └── project-context.tsx  # Workspace Context (activeProject, members, chat, invites)
├── components/
│   ├── auth/
│   │   ├── login-form.tsx   # Login form component with error states & demo credentials button
│   │   └── register-form.tsx # Register form with validation
│   ├── navigation/
│   │   ├── workspace-header.tsx # Top bar with Project Switcher, Member Avatars, Chat toggle
│   │   └── user-menu.tsx        # Profile dropdown & logout
│   ├── dashboard/
│   │   ├── project-grid.tsx     # Grid of projects (role badge, member count, last active)
│   │   ├── create-project-modal.tsx # Modal to create new workspace
│   │   └── join-project-modal.tsx   # Modal to enter 8-char invite code
│   ├── collaboration/
│   │   ├── invite-member-modal.tsx  # Modal showing shareable code, invite link, email input
│   │   └── member-list-popover.tsx  # Shows member list & roles
│   └── chat/
│       ├── chat-drawer.tsx      # Slide-over panel from right screen edge
│       ├── chat-message-list.tsx# Bubble feed grouped by sender/time
│       └── chat-input.tsx       # Message composer with auto-scroll & enter-to-send
└── app/
    ├── (auth)/
    │   ├── login/page.tsx       # /login route
    │   └── register/page.tsx    # /register route
    ├── (workspace)/
    │   ├── layout.tsx           # Authenticated layout with WorkspaceHeader & ChatDrawer
    │   ├── dashboard/page.tsx   # /dashboard route
    │   ├── join/[code]/page.tsx # /join/[code] invite link landing route
    │   └── projects/[id]/page.tsx # /projects/[id] main workspace route
    └── layout.tsx               # Root layout wrapping AuthProvider
```

---

### Task 1: Type Definitions & Zod Validation Schemas

**Files:**
- Create: `frontend/src/types/auth.ts`
- Create: `frontend/src/types/project.ts`
- Create: `frontend/src/types/chat.ts`
- Create: `frontend/src/lib/validation/client-schemas.ts`

**Interfaces:**
- Produces: `User`, `Project`, `ProjectMember`, `ChatMessage`, `loginSchema`, `registerSchema`, `createProjectSchema`, `joinCodeSchema`, `inviteEmailSchema`.

- [ ] **Step 1: Create auth type definitions (`frontend/src/types/auth.ts`)**
- [ ] **Step 2: Create project & collaboration type definitions (`frontend/src/types/project.ts`)**
- [ ] **Step 3: Create chat & presence type definitions (`frontend/src/types/chat.ts`)**
- [ ] **Step 4: Create Zod client validation schemas (`frontend/src/lib/validation/client-schemas.ts`)**
- [ ] **Step 5: Verify types compile without error (`npx tsc --noEmit`)**

---

### Task 2: Mock Storage, Seed Data & Service Layer

**Files:**
- Create: `frontend/src/lib/services/types.ts`
- Create: `frontend/src/lib/services/seed-data.ts`
- Create: `frontend/src/lib/services/mock-storage.ts`
- Create: `frontend/src/lib/services/auth-service.ts`
- Create: `frontend/src/lib/services/project-service.ts`
- Create: `frontend/src/lib/services/chat-service.ts`
- Create: `frontend/src/lib/services/index.ts`

**Interfaces:**
- Consumes: Types from `Task 1`.
- Produces: `authService`, `projectService`, `chatService` ready for context injection.

- [ ] **Step 1: Define Service Interfaces (`frontend/src/lib/services/types.ts`)**
- [ ] **Step 2: Create Seed Data (`frontend/src/lib/services/seed-data.ts`)**
- [ ] **Step 3: Create Mock Storage Helper (`frontend/src/lib/services/mock-storage.ts`)**
- [ ] **Step 4: Implement Mock Services (`auth-service.ts`, `project-service.ts`, `chat-service.ts`)**
- [ ] **Step 5: Export Service Factory (`frontend/src/lib/services/index.ts`)**
- [ ] **Step 6: Verify build passes (`npx tsc --noEmit`)**

---

### Task 3: React Contexts (AuthContext & ProjectContext)

**Files:**
- Create: `frontend/src/contexts/auth-context.tsx`
- Create: `frontend/src/contexts/project-context.tsx`

**Interfaces:**
- Consumes: Services from `src/lib/services/`.
- Produces: `useAuth()` and `useProjectWorkspace()` hooks.

- [ ] **Step 1: Implement AuthContext with user session & demo switchers**
- [ ] **Step 2: Implement ProjectContext with multi-project & realtime listeners**
- [ ] **Step 3: Verify build passes (`npx tsc --noEmit`)**

---

### Task 4: Auth UI Components & Pages (`/login`, `/register`)

**Files:**
- Create: `frontend/src/components/auth/login-form.tsx`
- Create: `frontend/src/components/auth/register-form.tsx`
- Create: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/register/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `loginSchema`, `registerSchema`.
- Produces: Accessible authentication interfaces with quick "Switch Demo User" toggles.

- [ ] **Step 1: Create LoginForm Component with validation & demo credentials**
- [ ] **Step 2: Create RegisterForm Component with field error indicators**
- [ ] **Step 3: Create Login & Register App Router pages**
- [ ] **Step 4: Verify Next.js routing compilation (`npx tsc --noEmit`)**

---

### Task 5: Dashboard & Workspace Switcher Components

**Files:**
- Create: `frontend/src/components/dashboard/create-project-modal.tsx`
- Create: `frontend/src/components/dashboard/join-project-modal.tsx`
- Create: `frontend/src/components/dashboard/project-grid.tsx`
- Create: `frontend/src/components/navigation/workspace-header.tsx`
- Create: `frontend/src/components/navigation/user-menu.tsx`
- Create: `frontend/src/app/(workspace)/layout.tsx`
- Create: `frontend/src/app/(workspace)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useProjectWorkspace()`.
- Produces: Complete workspace layout, project cards grid, create project modal, join with code modal.

- [ ] **Step 1: Create CreateProjectModal & JoinProjectModal components**
- [ ] **Step 2: Create ProjectGrid component displaying roles and member count**
- [ ] **Step 3: Create WorkspaceHeader with user dropdown & switcher**
- [ ] **Step 4: Create Workspace Layout & Dashboard page**
- [ ] **Step 5: Verify build passes (`npx tsc --noEmit`)**

---

### Task 6: Team Collaboration Drawer & Chat Components

**Files:**
- Create: `frontend/src/components/collaboration/invite-member-modal.tsx`
- Create: `frontend/src/components/chat/chat-message-list.tsx`
- Create: `frontend/src/components/chat/chat-input.tsx`
- Create: `frontend/src/components/chat/chat-drawer.tsx`

**Interfaces:**
- Consumes: `useProjectWorkspace()`, `useAuth()`, `inviteEmailSchema`.
- Produces: Slide-Over Chat Drawer with cross-tab message streaming and invite modal.

- [ ] **Step 1: Create InviteMemberModal (share code, copy link, invite email)**
- [ ] **Step 2: Create ChatMessageList with scroll-to-bottom and bubble grouping**
- [ ] **Step 3: Create ChatInput message composer**
- [ ] **Step 4: Create ChatDrawer slide-over container**
- [ ] **Step 5: Verify build passes (`npx tsc --noEmit`)**

---

### Task 7: Project Workspace Integration & Landing Routes

**Files:**
- Create: `frontend/src/app/(workspace)/projects/[id]/page.tsx`
- Create: `frontend/src/app/(workspace)/join/[code]/page.tsx`
- Modify: `frontend/src/app/layout.tsx` (Inject AuthProvider)

**Interfaces:**
- Consumes: Components from Task 1-6.
- Produces: Integrated project workspace view connecting views with top header and chat drawer.

- [ ] **Step 1: Wrap Root Layout with AuthProvider (`frontend/src/app/layout.tsx`)**
- [ ] **Step 2: Create /join/[code] Landing Route with auto-redirect**
- [ ] **Step 3: Create /projects/[id] Workspace Page**
- [ ] **Step 4: Verify full project builds cleanly (`npm run build`)**

---

### Task 8: End-to-End Verification & Interactive Testing

- [ ] **Step 1: Verify Dev Server & Next.js production build (`npm run build`)**
- [ ] **Step 2: Test Cross-Tab chat sync using 2 browser tabs**
- [ ] **Step 3: Commit all changes cleanly**
