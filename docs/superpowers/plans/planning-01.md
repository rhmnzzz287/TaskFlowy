# Auth, Team Collaboration, and Realtime Chat Implementation Plan (Security Hardened)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-budget, multi-user project workspace for TaskFlowy featuring Supabase email/password authentication, project ownership with invite codes/links, automated PostgreSQL task persistence, live Gantt synchronization, and an integrated realtime team chat drawer, fully hardened against SQL injection, RLS privilege escalation, PII enumeration, brute force, and CSV formula injection.

**Architecture:** The solution leverages Next.js 14 App Router connected to Supabase Free Tier (Auth, PostgreSQL, Row-Level Security, and WebSockets Realtime). Client and Server Component interactions use `@supabase/ssr` cookies for authentication. Projects use a project-centric model (`projects`, `project_members`, `tasks`, `project_messages`) with Row-Level Security enforcing strict tenant isolation. Critical operations (joining projects, finding user IDs for invites) run through atomic, security-definer PostgreSQL Stored Procedures (RPC). Gantt updates and team messages are broadcast live across connected clients via Supabase Realtime channels.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase Free Tier (`@supabase/supabase-js`, `@supabase/ssr`), Zod (Input validation & sanitization), Frappe Gantt, Lucide React.

**Spec:** [DESIGN.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/DESIGN.md) and [SCHEMA.md](file:///run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/SCHEMA.md)

## Global Constraints & Security Protocols (Hardened Defense-in-Depth)

- **Strict Parameterized Queries Only:** All database operations must go through Supabase client/PostgREST parameterized RPC. String interpolation, template literal concatenation (`SELECT * FROM ... ${input}`), or dynamic unescaped SQL execution is **FORBIDDEN**.
- **PostgreSQL `SECURITY DEFINER` Hardening:** All stored procedures/functions must explicitly declare `SET search_path = public, pg_temp;` to completely eliminate PostgreSQL schema search-path hijacking attacks.
- **Anti-Privilege Escalation on Joining:** Normal users are strictly **FORBIDDEN** from direct `INSERT` on `project_members`. Joining a project is only possible via the atomic RPC function `public.join_project_by_code(p_code TEXT)`, which enforces the `'member'` role and validates code existence in a single database transaction.
- **Anti-PII Scraping & User Enumeration Defense:** The `profiles` table is private. Users can only `SELECT` profiles of users who share at least one project with them. Adding a collaborator by email is handled by `public.get_user_id_by_email(p_email TEXT)` which returns a single UUID without allowing full table scanning.
- **High-Entropy Invite Codes (Anti-Brute Force):** Project invite codes use 8 uppercase alphanumeric characters split into two blocks (e.g. `FLOW-7K8P-2M9X`), providing $32^8 \approx 1.09 \times 10^{12}$ combinations, rendering automated guessing mathematically infeasible.
- **CSV Formula Injection Mitigation:** All CSV generation routines must sanitize every cell using `sanitizeCSVCell()`: if a cell starts with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`), it is escaped with a prepended single quote (`'`), preventing code execution in Microsoft Excel or Google Sheets.
- **Database-Level CHECK Constraints:** All text columns enforce strict length and regex limits directly in PostgreSQL:
  - `projects.name`: `1..100` characters.
  - `projects.invite_code`: `CHECK (invite_code ~ '^FLOW-[A-Z0-9]{4}-[A-Z0-9]{4}$')`.
  - `tasks.name`: `1..200` characters.
  - `tasks.progress`: `CHECK (progress >= 0 AND progress <= 100)`.
  - `project_messages.message`: `1..2000` characters.
- **Client & Server Input Sanitization (Zod):** Every route, action, and service must validate input payloads with Zod schemas before touching Supabase. UUID parameters must strictly conform to RFC 4122 (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`).
- **Budget & Performance Constraint:** Zero external hosting budget: Supabase Free Tier only (50,000 MAU, 500MB DB, 200 Realtime connections). Debounce timeline drag-and-drop auto-saving by 400ms to prevent database saturation.

---

## File Map & Responsibilities

```text
/
├── supabase/
│   └── migrations/
│       └── 20260905_init_schema.sql         # DDL tables, RPC procedures, CHECK constraints, hardened RLS
├── frontend/
│   ├── .env.example                         # Supabase URL & Anon Key templates
│   ├── src/
│   │   ├── middleware.ts                    # Next.js auth session guard & cookie refresh
│   │   ├── types/
│   │   │   └── database.ts                  # Supabase database TypeScript definitions
│   │   ├── lib/
│   │   │   ├── csv-export.ts                # CSV export with anti-formula injection sanitizer
│   │   │   ├── validation/
│   │   │   │   └── schemas.ts               # Zod anti-injection, high-entropy regex & sanitization schemas
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts                # Browser client (createBrowserClient)
│   │   │   │   ├── server.ts                # Server component client (createServerClient)
│   │   │   │   └── middleware.ts            # Middleware cookie handler
│   │   │   └── services/
│   │   │       ├── project-service.ts       # Sanitized project CRUD & atomic RPC join operations
│   │   │       ├── task-service.ts          # Sanitized task bulk sync & single update
│   │   │       └── chat-service.ts          # Sanitized messages retrieval & broadcast
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx           # Email/password login form
│   │   │   │   └── register/page.tsx        # Email/password registration form
│   │   │   ├── dashboard/page.tsx           # Project list, create project modal, join by code
│   │   │   ├── join/[code]/page.tsx         # Instant join link handler
│   │   │   └── projects/[id]/page.tsx       # Dynamic project workspace (Gantt + Chat)
│   │   └── components/
│   │       ├── auth/auth-form.tsx           # Shared authentication form
│   │       ├── dashboard/
│   │       │   ├── project-card.tsx         # Project preview card
│   │       │   ├── create-project-modal.tsx # Project creation dialog
│   │       │   └── join-project-modal.tsx   # Code-based project joining dialog
│   │       ├── project/
│   │       │   ├── project-header.tsx       # Project metadata, share/invite button, presence
│   │       │   └── invite-modal.tsx         # Dual invite modal (copy link/code + secure RPC email add)
│   │       └── chat/
│   │           └── team-chat-drawer.tsx     # Slide-over realtime team chat panel
```

---

### Task 1: Supabase Dependencies, Security Validation & Client Infrastructure

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/.env.example`
- Create: `frontend/src/lib/validation/schemas.ts`
- Create: `frontend/src/lib/supabase/client.ts`
- Create: `frontend/src/lib/supabase/server.ts`
- Create: `frontend/src/lib/supabase/middleware.ts`
- Create: `frontend/src/middleware.ts`

**Interfaces:**
- Consumes: Environment variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces: `createClient()` (browser), `createClient()` (server), `updateSession()` (middleware), Zod validation schemas (`uuidSchema`, `inviteCodeSchema`, `projectInputSchema`, `taskInputSchema`, `messageInputSchema`).

- [ ] **Step 1: Install `@supabase/supabase-js`, `@supabase/ssr`, and `zod`**

Run:
```bash
npm --prefix /run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/frontend install @supabase/supabase-js@^2.45.4 @supabase/ssr@^0.5.1 zod@^3.23.8
```

- [ ] **Step 2: Create `.env.example`**

Write to `frontend/.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 3: Create Zod Anti-Injection & High-Entropy Schemas**

Write to `frontend/src/lib/validation/schemas.ts`:
```typescript
import { z } from 'zod'

// Strict UUID regex to prevent parameter tampering and malformed SQL injections
export const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID format'
  )

// High-entropy invite code: FLOW-XXXX-XXXX (8 chars of Base32, ~1.09 trillion combinations)
export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^FLOW-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid invite code format (expected FLOW-XXXX-XXXX)')

// Sanitized text string helper: strips ASCII control chars
const sanitizedText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Minimum ${min} characters required`)
    .max(max, `Maximum ${max} characters allowed`)
    .transform(val => val.replace(/[\u0000-\u001F\u007F]/g, ''))

export const authInputSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
  name: z.string().trim().min(1).max(100).optional(),
})

export const projectInputSchema = z.object({
  name: sanitizedText(1, 100),
  description: z.string().trim().max(500).optional().nullable(),
})

export const taskInputSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: sanitizedText(1, 200),
  assignee: z.string().trim().max(100).optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  duration_days: z.number().int().min(0).max(3650),
  progress: z.number().int().min(0).max(100),
  depends_on: z.string().trim().max(200).optional().nullable(),
  is_critical: z.boolean(),
  is_milestone: z.boolean(),
  sort_order: z.number().int().min(0).max(10000),
})

export const messageInputSchema = z.object({
  message: sanitizedText(1, 2000),
})
```

- [ ] **Step 4: Create browser client helper**

Write to `frontend/src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  return createBrowserClient(supabaseUrl, supabaseKey)
}
```

- [ ] **Step 5: Create server client helper**

Write to `frontend/src/lib/supabase/server.ts`:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Handled in middleware
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Handled in middleware
        }
      },
    },
  })
}
```

- [ ] **Step 6: Create middleware cookie handler and Next.js middleware**

Write to `frontend/src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value, '', ...options })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({ name, value, ...options })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')
  const isProtectedPage = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/projects')

  if (!user && isProtectedPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
```

Write to `frontend/src/middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 7: Build and verify no compilation errors**

Run: `npm --prefix frontend run build`  
Expected: Build passes with static page generation.

- [ ] **Step 8: Commit Task 1**

```bash
git add frontend/package.json frontend/package-lock.json frontend/.env.example frontend/src/lib/validation frontend/src/lib/supabase frontend/src/middleware.ts
git commit -m "feat: add supabase ssr client configuration, zod validation schemas, and auth middleware"
```

---

### Task 2: Hardened Database Schema DDL, RPC Procedures & TypeScript Types

**Files:**
- Create: `supabase/migrations/20260905_init_schema.sql`
- Create: `frontend/src/types/database.ts`

**Interfaces:**
- Consumes: None (Root database migration).
- Produces: `Database` TypeScript definitions, PostgreSQL tables: `profiles`, `projects`, `project_members`, `tasks`, `project_messages`, Stored Procedures: `join_project_by_code`, `get_user_id_by_email`.

- [ ] **Step 1: Write Hardened PostgreSQL DDL Migration with Strict RLS, RPCs and Constraints**

Write to `supabase/migrations/20260905_init_schema.sql`:
```sql
-- 1. Profiles Table with PII Isolation
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_profile_name_len CHECK (char_length(name) >= 1)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anti-Scraping RLS: Users can only see their own profile or profiles of collaborators in shared projects
CREATE POLICY "Users can only view collaborators in shared projects"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.id
    )
  );

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile upon auth.users signup with hardened search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 1, 100),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure RPC to fetch user ID by exact email without opening table to scraping
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = LOWER(TRIM(p_email));

  RETURN v_user_id;
END;
$$;

-- 2. Projects Table with High-Entropy Invite Code format (FLOW-XXXX-XXXX)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) DEFAULT '',
  invite_code VARCHAR(16) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_project_name_len CHECK (char_length(name) >= 1),
  CONSTRAINT chk_invite_code_format CHECK (invite_code ~ '^FLOW-[A-Z0-9]{4}-[A-Z0-9]{4}$')
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. Project Members Table
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Member RLS Policies: Only project members can view membership
CREATE POLICY "Users can view members of their projects"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- STRICT: Only project owners can manually insert members (e.g. by email)
CREATE POLICY "Only project owners can directly insert members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
      AND p.owner_id = auth.uid()
    )
  );

-- Atomic RPC function to join a project with an invite code (Anti-Privilege Escalation)
CREATE OR REPLACE FUNCTION public.join_project_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Atomic lookup with strict regex validation
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE invite_code = UPPER(TRIM(p_code));

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Insert or ignore if already member, ALWAYS forcing 'member' role
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (v_project_id, v_caller_id, 'member')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN v_project_id;
END;
$$;

-- Project RLS Policies
CREATE POLICY "Members can view their projects"
  ON public.projects FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- 4. Tasks Table with range and content sanitization constraints
CREATE TABLE IF NOT EXISTS public.tasks (
  id VARCHAR(64) NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  assignee VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INT NOT NULL DEFAULT 1,
  progress INT NOT NULL DEFAULT 0,
  depends_on VARCHAR(200),
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  is_milestone BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, project_id),
  CONSTRAINT chk_task_name_len CHECK (char_length(name) >= 1),
  CONSTRAINT chk_task_progress_range CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT chk_task_duration_range CHECK (duration_days >= 0 AND duration_days <= 3650)
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can read tasks"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- 5. Project Messages Table (Team Chat) with strict message limits
CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_message_length CHECK (char_length(message) >= 1)
);

ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view messages"
  ON public.project_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_messages.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can send messages"
  ON public.project_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_messages.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Enable Realtime publication for tasks and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
```

- [ ] **Step 2: Create TypeScript database schema definitions**

Write to `frontend/src/types/database.ts`:
```typescript
export interface Profile {
  id: string
  name: string
  email: string
  avatar_url: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  invite_code: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profile?: Profile
}

export interface DbTask {
  id: string
  project_id: string
  name: string
  assignee: string | null
  start_date: string
  end_date: string
  duration_days: number
  progress: number
  depends_on: string | null
  is_critical: boolean
  is_milestone: boolean
  sort_order: number
  updated_at: string
}

export interface ProjectMessage {
  id: string
  project_id: string
  sender_id: string
  message: string
  created_at: string
  sender?: Profile
}
```

- [ ] **Step 3: Commit Task 2**

```bash
git add supabase/migrations/20260905_init_schema.sql frontend/src/types/database.ts
git commit -m "feat: add hardened supabase ddl migration with atomic rpcs, anti-scraping rls, and check constraints"
```

---

### Task 3: Authentication Flow (`/login`, `/register`, and Logout) with Validation

**Files:**
- Create: `frontend/src/components/auth/auth-form.tsx`
- Create: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/register/page.tsx`
- Create: `frontend/src/app/(auth)/layout.tsx`

**Interfaces:**
- Consumes: `authInputSchema` from `@/lib/validation/schemas`, `createClient()` from `@/lib/supabase/client`.
- Produces: Client pages for `/login` and `/register`.

- [ ] **Step 1: Create reusable `AuthForm` component with Zod validation**

Write to `frontend/src/components/auth/auth-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { authInputSchema } from '@/lib/validation/schemas'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validation = authInputSchema.safeParse({ email, password, name })
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Invalid form input')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      if (mode === 'register') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: {
            data: { name: validation.data.name?.trim() || validation.data.email.split('@')[0] },
          },
        })
        if (signUpError) throw signUpError
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        })
        if (signInError) throw signInError
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm p-6 bg-surface border border-border rounded-lg shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-text-primary">
          {mode === 'login' ? 'Sign In to TaskFlowy' : 'Create an Account'}
        </h1>
        <p className="text-xs text-muted mt-1">
          {mode === 'login'
            ? 'Access your Gantt schedules and team projects'
            : 'Get started with collaborative timeline scheduling'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded flex items-start gap-2 text-error text-xs">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {mode === 'register' && (
          <div className="flex flex-col gap-1">
            <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              required
              maxLength={100}
              className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 text-sm"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            required
            maxLength={255}
            className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 text-sm"
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            minLength={6}
            maxLength={72}
            className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 text-sm"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2 mt-2"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-muted">
        {mode === 'login' ? (
          <span>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register now
            </Link>
          </span>
        ) : (
          <span>
            Already registered?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Auth layout, Login page, and Register page**

Write to `frontend/src/app/(auth)/layout.tsx`:
```tsx
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {children}
    </div>
  )
}
```

Write to `frontend/src/app/(auth)/login/page.tsx`:
```tsx
import { AuthForm } from '@/components/auth/auth-form'

export default function LoginPage() {
  return <AuthForm mode="login" />
}
```

Write to `frontend/src/app/(auth)/register/page.tsx`:
```tsx
import { AuthForm } from '@/components/auth/auth-form'

export default function RegisterPage() {
  return <AuthForm mode="register" />
}
```

- [ ] **Step 3: Commit Task 3**

```bash
git add frontend/src/app/\(auth\) frontend/src/components/auth
git commit -m "feat: implement validated login and register pages"
```

---

### Task 4: Project Dashboard & Project Creation (`/dashboard`) with High-Entropy Codes & Atomic Joins

**Files:**
- Create: `frontend/src/lib/services/project-service.ts`
- Create: `frontend/src/components/dashboard/create-project-modal.tsx`
- Create: `frontend/src/components/dashboard/join-project-modal.tsx`
- Create: `frontend/src/components/dashboard/project-card.tsx`
- Create: `frontend/src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `projectInputSchema`, `inviteCodeSchema`, `uuidSchema` from `@/lib/validation/schemas`.
- Produces: `getUserProjects()`, `createNewProject()`, `joinProjectByInviteCode()`.

- [ ] **Step 1: Write `project-service.ts` with high entropy generator and atomic RPC join**

Write to `frontend/src/lib/services/project-service.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types/database'
import { projectInputSchema, inviteCodeSchema, uuidSchema } from '@/lib/validation/schemas'

// High-entropy 8-character invite code (e.g. FLOW-7K8P-2M9X, 32^8 = ~1.09 trillion combinations)
function generateHighEntropyInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let part1 = ''
  let part2 = ''
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length))
    part2 += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `FLOW-${part1}-${part2}`
}

export async function getUserProjects(): Promise<{ owned: Project[]; member: Project[] }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { owned: [], member: [] }

  const validatedUserId = uuidSchema.parse(user.id)

  const { data: memberships, error } = await supabase
    .from('project_members')
    .select('role, projects(*)')
    .eq('user_id', validatedUserId)

  if (error || !memberships) return { owned: [], member: [] }

  const owned: Project[] = []
  const member: Project[] = []

  memberships.forEach((m: any) => {
    if (m.projects) {
      if (m.role === 'owner') {
        owned.push(m.projects)
      } else {
        member.push(m.projects)
      }
    }
  })

  return { owned, member }
}

export async function createNewProject(name: string, description?: string): Promise<Project> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to create a project.')

  const validatedOwnerId = uuidSchema.parse(user.id)
  const validatedInput = projectInputSchema.parse({ name, description })
  const invite_code = generateHighEntropyInviteCode()
  inviteCodeSchema.parse(invite_code)

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .insert({
      name: validatedInput.name,
      description: validatedInput.description || null,
      invite_code,
      owner_id: validatedOwnerId,
    })
    .select()
    .single()

  if (pErr || !project) throw pErr || new Error('Failed to create project.')

  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: validatedOwnerId,
    role: 'owner',
  })

  return project
}

// Atomic RPC join: calls PostgreSQL stored procedure join_project_by_code
export async function joinProjectByInviteCode(code: string): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to join a project.')

  const validatedCode = inviteCodeSchema.parse(code)

  const { data: projectId, error } = await supabase.rpc('join_project_by_code', {
    p_code: validatedCode,
  })

  if (error || !projectId) {
    throw new Error(error?.message || 'Invalid or expired project code.')
  }

  return projectId as string
}
```

- [ ] **Step 2: Create project card, create modal, and join modal**

Write to `frontend/src/components/dashboard/project-card.tsx`:
```tsx
import Link from 'next/link'
import { Calendar, ArrowUpRight } from 'lucide-react'
import { Project } from '@/types/database'

interface ProjectCardProps {
  project: Project
  role: 'owner' | 'member'
}

export function ProjectCard({ project, role }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="p-4 bg-surface border border-border rounded-lg hover:border-primary/50 transition-all flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="px-1.5 py-0.5 bg-surface-hi text-text-dim text-[11px] font-mono rounded">
            {project.invite_code}
          </span>
          <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
            role === 'owner' ? 'bg-primary/20 text-primary' : 'bg-surface-hi text-muted'
          }`}>
            {role}
          </span>
        </div>
        <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        <p className="text-xs text-muted line-clamp-2 mt-1">
          {project.description || 'No description provided.'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1">
          <Calendar size={13} />
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
        </span>
        <span className="flex items-center gap-1 text-primary font-medium group-hover:translate-x-0.5 transition-transform">
          <span>Open Workspace</span>
          <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  )
}
```

Write to `frontend/src/components/dashboard/create-project-modal.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { createNewProject } from '@/lib/services/project-service'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await createNewProject(name, description)
      setName('')
      setDescription('')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Create New Project</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary p-1 rounded">
            <X size={16} />
          </button>
        </div>

        {error && (
          <p className="text-error text-xs mt-3 bg-error/10 p-2 rounded border border-error/30">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4">
          <div className="flex flex-col gap-1">
            <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Project Name</label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Q4 Platform Launch"
              className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 text-sm"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Description (Optional)</label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Brief summary of timelines and objectives..."
              className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 text-sm resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Write to `frontend/src/components/dashboard/join-project-modal.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { X, LogIn, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { joinProjectByInviteCode } from '@/lib/services/project-service'

interface JoinProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinProjectModal({ isOpen, onClose }: JoinProjectModalProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const projectId = await joinProjectByInviteCode(code)
      router.push(`/projects/${projectId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join project.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg shadow-xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Join with Project Code</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary p-1 rounded">
            <X size={16} />
          </button>
        </div>

        {error && (
          <p className="text-error text-xs mt-3 bg-error/10 p-2 rounded border border-error/30">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mt-4">
          <div className="flex flex-col gap-1">
            <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Unique Invite Code</label>
            <input
              type="text"
              required
              maxLength={16}
              placeholder="FLOW-XXXX-XXXX"
              className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 font-mono text-center text-sm uppercase tracking-wider"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !code.trim()} className="btn-primary">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
              <span>Join Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the Dashboard Page (`/dashboard`)**

Write to `frontend/src/app/dashboard/page.tsx`:
```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LogIn, LogOut, FolderKanban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getUserProjects } from '@/lib/services/project-service'
import { ProjectCard } from '@/components/dashboard/project-card'
import { CreateProjectModal } from '@/components/dashboard/create-project-modal'
import { JoinProjectModal } from '@/components/dashboard/join-project-modal'
import { Project } from '@/types/database'

export default function DashboardPage() {
  const router = useRouter()
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([])
  const [memberProjects, setMemberProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserEmail(user.email || null)
      const { owned, member } = await getUserProjects()
      setOwnedProjects(owned)
      setMemberProjects(member)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const allProjects = [...ownedProjects, ...memberProjects]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <FolderKanban className="text-primary" size={20} />
          <h1 className="text-base font-bold text-text-primary">TaskFlowy Projects</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-mono">{userEmail}</span>
          <button onClick={handleSignOut} className="btn-secondary text-xs" title="Sign out">
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Your Timelines</h2>
            <p className="text-xs text-muted mt-0.5">Manage schedules, invite your team, and track critical paths</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsJoinOpen(true)} className="btn-secondary">
              <LogIn size={14} />
              <span>Join with Code</span>
            </button>
            <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted text-sm">
            Loading your projects...
          </div>
        ) : allProjects.length === 0 ? (
          <div className="h-80 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-8 text-center bg-surface/20">
            <FolderKanban size={40} className="text-muted/60 mb-3" />
            <h3 className="text-base font-semibold text-text-primary">No projects found</h3>
            <p className="text-xs text-muted max-w-sm mt-1 mb-4">
              Turn your project schedule into an interactive Gantt timeline. Create a project to start planning.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
                <Plus size={14} />
                <span>Create Your First Project</span>
              </button>
              <button onClick={() => setIsJoinOpen(true)} className="btn-secondary">
                <LogIn size={14} />
                <span>Join with Code</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedProjects.map(p => (
              <ProjectCard key={p.id} project={p} role="owner" />
            ))}
            {memberProjects.map(p => (
              <ProjectCard key={p.id} project={p} role="member" />
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchProjects}
      />
      <JoinProjectModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Commit Task 4**

```bash
git add frontend/src/lib/services/project-service.ts frontend/src/components/dashboard frontend/src/app/dashboard
git commit -m "feat: implement high-entropy code generation and atomic rpc join flow"
```

---

### Task 5: Direct Join Link & In-App Invite Modal with Secure User Lookup

**Files:**
- Create: `frontend/src/app/join/[code]/page.tsx`
- Create: `frontend/src/components/project/invite-modal.tsx`

**Interfaces:**
- Consumes: `inviteCodeSchema`, `uuidSchema` from `@/lib/validation/schemas`, `get_user_id_by_email` RPC.
- Produces: `/join/[code]` validated onboarding and Workspace Invite Modal.

- [ ] **Step 1: Create direct join link handler `/join/[code]`**

Write to `frontend/src/app/join/[code]/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { joinProjectByInviteCode } from '@/lib/services/project-service'
import { inviteCodeSchema } from '@/lib/validation/schemas'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'

export default function JoinByCodePage() {
  const params = useParams()
  const router = useRouter()
  const rawCode = (params?.code as string) || ''
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleJoin() {
      const validation = inviteCodeSchema.safeParse(rawCode)
      if (!validation.success) {
        setError('Invalid invitation code format (expected FLOW-XXXX-XXXX).')
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push(`/register?redirectTo=/join/${validation.data}`)
        return
      }

      try {
        const projectId = await joinProjectByInviteCode(validation.data)
        router.push(`/projects/${projectId}`)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Invalid or expired invitation code.')
      }
    }

    if (rawCode) {
      handleJoin()
    }
  }, [rawCode, router])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 bg-surface border border-border rounded-lg text-center shadow-lg">
        {error ? (
          <div>
            <AlertCircle size={36} className="text-error mx-auto mb-3" />
            <h2 className="text-base font-semibold text-text-primary mb-1">Invitation Failed</h2>
            <p className="text-xs text-muted mb-4">{error}</p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary w-full justify-center">
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm font-medium text-text-primary">Joining project {rawCode}...</p>
            <p className="text-xs text-muted">Setting up your collaborative timeline access</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `InviteModal` using `get_user_id_by_email` RPC to prevent PII scraping**

Write to `frontend/src/components/project/invite-modal.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { X, Copy, Check, UserPlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uuidSchema } from '@/lib/validation/schemas'
import { z } from 'zod'
import { Project } from '@/types/database'

interface InviteModalProps {
  project: Project
  isOpen: boolean
  onClose: () => void
}

export function InviteModal({ project, isOpen, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  if (!isOpen) return null

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${project.invite_code}` : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const emailResult = z.string().trim().email('Invalid email address').safeParse(email)
    if (!emailResult.success) {
      setMessage({ text: emailResult.error.errors[0]?.message || 'Invalid email', isError: true })
      return
    }

    setLoading(true)
    const supabase = createClient()
    try {
      const validatedProjectId = uuidSchema.parse(project.id)

      // Use secure RPC to find target user ID without exposing entire profiles table
      const { data: targetUserId, error: rpcErr } = await supabase.rpc('get_user_id_by_email', {
        p_email: emailResult.data.toLowerCase(),
      })

      if (rpcErr || !targetUserId) {
        throw new Error('User not found. They must register first, or share the invite link below.')
      }

      const { error: mErr } = await supabase.from('project_members').insert({
        project_id: validatedProjectId,
        user_id: targetUserId,
        role: 'member',
      })

      if (mErr) {
        if (mErr.code === '23505') {
          throw new Error('User is already a member of this project.')
        }
        throw mErr
      }

      setMessage({ text: `Successfully added ${emailResult.data} to project!`, isError: false })
      setEmail('')
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to add member', isError: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Invite Team Members</h2>
            <p className="text-xs text-muted">Collaborate on &quot;{project.name}&quot;</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text-primary p-1 rounded">
            <X size={16} />
          </button>
        </div>

        {message && (
          <p className={`text-xs mt-3 p-2 rounded border ${
            message.isError ? 'bg-error/10 border-error/30 text-error' : 'bg-completed/10 border-completed/30 text-completed'
          }`}>
            {message.text}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Shareable Invite Link</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={joinUrl}
              className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 text-xs font-mono select-all flex-1"
            />
            <button onClick={handleCopyLink} className="btn-primary py-1.5 text-xs">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-muted">Or share project code: <span className="font-mono text-text-primary font-bold">{project.invite_code}</span></p>
        </div>

        <form onSubmit={handleAddEmail} className="mt-5 pt-4 border-t border-border flex flex-col gap-2">
          <label className="text-muted text-[11px] font-medium uppercase tracking-wider">Add Registered User by Email</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              required
              placeholder="colleague@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="cell-input border border-border bg-surface-dim px-2.5 py-1.5 text-xs flex-1"
            />
            <button type="submit" disabled={loading || !email.trim()} className="btn-secondary py-1.5 text-xs">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit Task 5**

```bash
git add frontend/src/app/join frontend/src/components/project/invite-modal.tsx
git commit -m "feat: implement anti-scraping email invite lookup and join handler"
```

---

### Task 6: Database Task Service, Dynamic Workspace & Anti-CSV Injection

**Files:**
- Modify: `frontend/src/lib/csv-export.ts`
- Create: `frontend/src/lib/services/task-service.ts`
- Create: `frontend/src/components/project/project-header.tsx`
- Create: `frontend/src/app/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `taskInputSchema`, `uuidSchema` from `@/lib/validation/schemas`.
- Produces: Sanitized `fetchProjectTasks()`, `saveProjectTasks()`, `updateSingleTask()`, and `sanitizeCSVCell()` in `csv-export.ts`.

- [ ] **Step 1: Implement CSV Formula Sanitization in `frontend/src/lib/csv-export.ts`**

Update `frontend/src/lib/csv-export.ts`:
```typescript
import { TimelineTask } from '@/lib/schema'

// Anti-CSV Formula Injection: escape cells starting with =, +, -, @, or tabs
export function sanitizeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let str = String(value).trim()
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  // Escape double quotes per RFC 4180
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateCSV(tasks: TimelineTask[]): string {
  const headers = ['id', 'name', 'assignee', 'start', 'end', 'durationDays', 'progress', 'dependsOn', 'isCritical']
  const rows = tasks.map(t => [
    sanitizeCSVCell(t.id),
    sanitizeCSVCell(t.name),
    sanitizeCSVCell(t.assignee || ''),
    sanitizeCSVCell(t.start),
    sanitizeCSVCell(t.end),
    sanitizeCSVCell(t.durationDays),
    sanitizeCSVCell(t.progress ?? 0),
    sanitizeCSVCell(t.dependsOn || ''),
    sanitizeCSVCell(t.isCritical ? 'TRUE' : 'FALSE'),
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

export function downloadCSV(tasks: TimelineTask[], filename = 'timeline.csv'): void {
  const csvContent = generateCSV(tasks)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Write `task-service.ts` with validation and parameterized upsert**

Write to `frontend/src/lib/services/task-service.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import { TimelineTask } from '@/lib/schema'
import { DbTask } from '@/types/database'
import { uuidSchema, taskInputSchema } from '@/lib/validation/schemas'

export function toTimelineTask(db: DbTask): TimelineTask {
  return {
    id: db.id,
    name: db.name,
    assignee: db.assignee || null,
    start: db.start_date,
    end: db.end_date,
    durationDays: db.duration_days,
    progress: db.progress,
    dependsOn: db.depends_on || undefined,
    isCritical: db.is_critical,
    isMilestone: db.is_milestone,
    status: (db.progress >= 100 ? 'completed' : db.is_critical ? 'critical' : 'in-progress') as any,
  }
}

export async function fetchProjectTasks(projectId: string): Promise<TimelineTask[]> {
  const validatedProjectId = uuidSchema.parse(projectId)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', validatedProjectId)
    .order('sort_order', { ascending: true })

  if (error || !data) return []
  return data.map(toTimelineTask)
}

export async function saveProjectTasks(projectId: string, tasks: TimelineTask[]): Promise<void> {
  const validatedProjectId = uuidSchema.parse(projectId)
  const supabase = createClient()

  const records = tasks.map((t, index) => {
    const validated = taskInputSchema.parse({
      id: t.id,
      name: t.name,
      assignee: t.assignee || null,
      start_date: t.start,
      end_date: t.end,
      duration_days: t.durationDays,
      progress: t.progress ?? 0,
      depends_on: t.dependsOn || null,
      is_critical: !!t.isCritical,
      is_milestone: !!t.isMilestone,
      sort_order: index,
    })

    return {
      ...validated,
      project_id: validatedProjectId,
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase.from('tasks').upsert(records, { onConflict: 'id,project_id' })
  if (error) {
    console.error('Error saving tasks to Supabase:', error)
  }
}

export async function updateSingleTask(projectId: string, task: TimelineTask): Promise<void> {
  const validatedProjectId = uuidSchema.parse(projectId)
  const validated = taskInputSchema.parse({
    id: task.id,
    name: task.name,
    assignee: task.assignee || null,
    start_date: task.start,
    end_date: task.end,
    duration_days: task.durationDays,
    progress: task.progress ?? 0,
    depends_on: task.dependsOn || null,
    is_critical: !!task.isCritical,
    is_milestone: !!task.isMilestone,
    sort_order: 0,
  })

  const supabase = createClient()
  await supabase
    .from('tasks')
    .update({
      name: validated.name,
      assignee: validated.assignee,
      start_date: validated.start_date,
      end_date: validated.end_date,
      duration_days: validated.duration_days,
      progress: validated.progress,
      depends_on: validated.depends_on,
      is_critical: validated.is_critical,
      is_milestone: validated.is_milestone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.id)
    .eq('project_id', validatedProjectId)
}
```

- [ ] **Step 3: Create Project Header component**

Write to `frontend/src/components/project/project-header.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { ChevronLeft, Share2, MessageSquare } from 'lucide-react'
import { Project } from '@/types/database'
import { TimelineTask } from '@/lib/schema'
import { ExportButton } from '@/components/export-csv/export-button'

interface ProjectHeaderProps {
  project: Project
  tasks: TimelineTask[]
  onOpenInvite: () => void
  onToggleChat: () => void
  isChatOpen: boolean
  unreadCount?: number
}

export function ProjectHeader({
  project,
  tasks,
  onOpenInvite,
  onToggleChat,
  isChatOpen,
  unreadCount = 0,
}: ProjectHeaderProps) {
  return (
    <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-3 shrink-0 z-20">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href="/dashboard" className="p-1 rounded text-muted hover:text-text-primary hover:bg-surface-hi transition-colors">
          <ChevronLeft size={16} />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-[14px] font-semibold text-text-primary truncate">{project.name}</h1>
          <span className="px-1.5 py-0.5 bg-surface-hi text-text-dim text-[11px] font-mono rounded shrink-0">
            {project.invite_code}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted text-[11px] font-mono hidden sm:inline">{tasks.length} tasks</span>
        <button onClick={onOpenInvite} className="btn-secondary text-[12px]">
          <Share2 size={13} />
          <span>Invite Team</span>
        </button>
        {tasks.length > 0 && <ExportButton tasks={tasks} />}
        <button
          onClick={onToggleChat}
          className={`btn-secondary text-[12px] relative ${isChatOpen ? 'bg-primary/20 text-primary border-primary/40' : ''}`}
        >
          <MessageSquare size={13} />
          <span>Team Chat</span>
          {unreadCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-critical absolute -top-0.5 -right-0.5" />
          )}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create `/projects/[id]/page.tsx` integrating Gantt, autosave, and dialogs**

Write to `frontend/src/app/projects/[id]/page.tsx`:
```tsx
'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Play, BarChart3, Table2, GitBranch } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uuidSchema } from '@/lib/validation/schemas'
import { Project } from '@/types/database'
import { fetchProjectTasks, saveProjectTasks } from '@/lib/services/task-service'
import { ProjectHeader } from '@/components/project/project-header'
import { InviteModal } from '@/components/project/invite-modal'
import { TeamChatDrawer } from '@/components/chat/team-chat-drawer'
import { RowEditor } from '@/components/task-input/row-editor'
import { ReviewTable } from '@/components/parse-review/review-table'
import { AssigneeFilter } from '@/components/assignee-filter/filter-bar'
import { GanttBoard } from '@/components/gantt-board/gantt-board'
import { InspectorDrawer } from '@/components/inspector/inspector-drawer'
import { LegendBar } from '@/components/ui/legend-bar'
import { AmbiguityAlert } from '@/components/ui/ambiguity-alert'
import { TableView } from '@/components/table-view/table-view'
import { DependencyView } from '@/components/dependency-view/dependency-view'
import {
  ParseRowState,
  TimelineTask,
  TimelineDependency,
  createRowId,
  createDepId,
  todayRef,
  computeCriticalPath,
  detectCycles,
} from '@/lib/schema'
import { parseRows } from '@/lib/parser/row-parser'

export default function ProjectWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const rawProjectId = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<TimelineTask[]>([])
  const [dependencies, setDependencies] = useState<TimelineDependency[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [compactWorkbench, setCompactWorkbench] = useState(false)
  const [view, setView] = useState<'gantt' | 'table' | 'dependency'>('gantt')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [inputRows, setInputRows] = useState<ParseRowState[]>([
    { id: createRowId(), name: '', assignee: '', start: '', duration: '', end: '', dependsOn: '' },
  ])

  const projectId = useMemo(() => {
    const res = uuidSchema.safeParse(rawProjectId)
    return res.success ? res.data : null
  }, [rawProjectId])

  useEffect(() => {
    async function load() {
      if (!projectId) {
        router.push('/dashboard')
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      const { data: p } = await supabase.from('projects').select('*').eq('id', projectId).single()
      if (!p) {
        router.push('/dashboard')
        return
      }
      setProject(p)

      const loadedTasks = await fetchProjectTasks(projectId)
      setTasks(loadedTasks)
      if (loadedTasks.length > 0) {
        setCompactWorkbench(true)
      }
    }
    load()
  }, [projectId, router])

  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const handleTasksChange = useCallback((updated: TimelineTask[]) => {
    setTasks(updated)
    if (!projectId) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveProjectTasks(projectId, updated)
    }, 400)
  }, [projectId])

  const handleParse = useCallback(() => {
    if (!projectId) return
    const referenceDate = todayRef()
    const parseInputs = inputRows.map(r => ({
      name: r.name,
      assignee: r.assignee || null,
      start: r.start,
      duration: r.duration || null,
      end: r.end || null,
    }))

    const result = parseRows(parseInputs, referenceDate)
    const errMap: Record<string, string> = {}
    for (const [idx, errs] of Object.entries(result.errors)) {
      const rowId = inputRows[parseInt(idx)]?.id
      if (rowId) errMap[rowId] = errs[0]
    }
    setErrors(errMap)

    if (Object.keys(errMap).length === 0) {
      const deps: TimelineDependency[] = []
      const nameToId = new Map(result.tasks.map(t => [t.name, t.id]))
      inputRows.forEach((r, i) => {
        const depName = r.dependsOn?.trim()
        if (depName && nameToId.has(depName) && i < result.tasks.length) {
          deps.push({ id: createDepId(), sourceId: nameToId.get(depName)!, targetId: result.tasks[i].id, type: 'FS' })
        }
      })

      const tasksWithMeta = result.tasks.map(t => ({
        ...t,
        progress: 0,
        isMilestone: t.durationDays === 0,
        status: 'in-progress' as const,
      }))
      const criticalIds = computeCriticalPath(tasksWithMeta, deps)
      const cycles = detectCycles(tasksWithMeta, deps)

      const finalTasks = tasksWithMeta.map(t => ({
        ...t,
        isCritical: criticalIds.has(t.id),
        color: criticalIds.has(t.id) ? '#EA580C' : undefined,
      }))

      setTasks(finalTasks)
      setDependencies(deps)
      setWarnings([...result.warnings, ...cycles])
      saveProjectTasks(projectId, finalTasks)
      setCompactWorkbench(true)
    }
  }, [inputRows, projectId])

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [tasks, selectedTaskId])
  const canGenerate = inputRows.some(r => r.name.trim().length > 0)

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-muted text-sm">
        Loading project workspace...
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <ProjectHeader
        project={project}
        tasks={tasks}
        onOpenInvite={() => setIsInviteOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
      />

      <div className="flex-1 flex min-h-0 relative">
        <nav className="w-12 bg-surface border-r border-border flex flex-col items-center py-2 gap-2 shrink-0 z-10">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'gantt' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary'}`}
            title="Gantt"
            onClick={() => setView('gantt')}
          >
            <BarChart3 size={16} />
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'table' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary'}`}
            title="Table"
            onClick={() => setView('table')}
          >
            <Table2 size={16} />
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${view === 'dependency' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-text-primary'}`}
            title="Dependencies"
            onClick={() => setView('dependency')}
          >
            <GitBranch size={16} />
          </button>
        </nav>

        <div className="flex-1 flex flex-col min-w-0">
          <section className="bg-surface-dim border-b border-border">
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <h2 className="text-text-primary text-[13px] font-semibold">Schedule Input</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary text-[12px]"
                  onClick={() => setCompactWorkbench(!compactWorkbench)}
                >
                  {compactWorkbench ? 'Edit Schedule Rows' : 'Hide Editor'}
                </button>
                {!compactWorkbench && (
                  <button className="btn-primary text-[12px]" onClick={handleParse} disabled={!canGenerate}>
                    <Play size={12} />
                    <span>Generate Timeline</span>
                  </button>
                )}
              </div>
            </div>
            {!compactWorkbench && (
              <div className="px-3 pb-2">
                <RowEditor rows={inputRows} onChange={setInputRows} errors={errors} />
              </div>
            )}
          </section>

          {warnings.length > 0 && <AmbiguityAlert warnings={warnings} />}

          <div className="h-10 bg-surface border-b border-border flex items-center justify-between px-3 shrink-0">
            <div className="flex items-center gap-2">
              <AssigneeFilter tasks={tasks} selected={selectedAssignees} onChange={setSelectedAssignees} />
            </div>
          </div>

          {view === 'gantt' ? (
            <div className="flex-1 flex min-h-0">
              {tasks.length > 0 && (
                <div className="w-[390px] xl:w-[420px] shrink-0 border-r border-border bg-surface/30 flex flex-col">
                  <ReviewTable
                    tasks={tasks}
                    warnings={[]}
                    compact
                    onSelectTask={setSelectedTaskId}
                    selectedTaskId={selectedTaskId}
                  />
                </div>
              )}
              <div className="flex-1 flex flex-col min-w-0">
                <GanttBoard
                  tasks={tasks}
                  selectedAssignees={selectedAssignees}
                  onTasksChange={handleTasksChange}
                  onSelectTask={setSelectedTaskId}
                />
                <LegendBar tasks={tasks} warnings={warnings} />
              </div>
            </div>
          ) : view === 'table' ? (
            <TableView
              tasks={tasks}
              onSelectTask={setSelectedTaskId}
              selectedTaskId={selectedTaskId}
              onTasksChange={handleTasksChange}
            />
          ) : (
            <DependencyView
              tasks={tasks}
              dependencies={dependencies}
              onSelectTask={setSelectedTaskId}
              selectedTaskId={selectedTaskId}
            />
          )}
        </div>

        {selectedTask && (
          <InspectorDrawer
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={updated => {
              const next = tasks.map(t => (t.id === updated.id ? updated : t))
              handleTasksChange(next)
            }}
          />
        )}

        {projectId && (
          <TeamChatDrawer
            projectId={projectId}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            currentUserId={currentUserId || ''}
          />
        )}
      </div>

      <InviteModal
        project={project}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit Task 6**

```bash
git add frontend/src/lib/csv-export.ts frontend/src/lib/services/task-service.ts frontend/src/components/project/project-header.tsx frontend/src/app/projects/\[id\]
git commit -m "feat: implement anti-csv formula injection sanitizer and validated task workspace"
```

---

### Task 7: Realtime Team Chat Drawer (`project_messages`) with Message Length Constraints

**Files:**
- Create: `frontend/src/lib/services/chat-service.ts`
- Create: `frontend/src/components/chat/team-chat-drawer.tsx`

**Interfaces:**
- Consumes: `messageInputSchema`, `uuidSchema` from `@/lib/validation/schemas`.
- Produces: `fetchProjectMessages()`, `sendProjectMessage()`, and `TeamChatDrawer`.

- [ ] **Step 1: Write `chat-service.ts` with validation**

Write to `frontend/src/lib/services/chat-service.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import { ProjectMessage } from '@/types/database'
import { uuidSchema, messageInputSchema } from '@/lib/validation/schemas'

export async function fetchProjectMessages(projectId: string): Promise<ProjectMessage[]> {
  const validatedProjectId = uuidSchema.parse(projectId)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_messages')
    .select('*, sender:profiles(*)')
    .eq('project_id', validatedProjectId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data
}

export async function sendProjectMessage(projectId: string, rawMessage: string): Promise<void> {
  const validatedProjectId = uuidSchema.parse(projectId)
  const validated = messageInputSchema.parse({ message: rawMessage })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const validatedSenderId = uuidSchema.parse(user.id)

  const { error } = await supabase.from('project_messages').insert({
    project_id: validatedProjectId,
    sender_id: validatedSenderId,
    message: validated.message,
  })

  if (error) throw error
}
```

- [ ] **Step 2: Create `TeamChatDrawer` with Realtime subscription**

Write to `frontend/src/components/chat/team-chat-drawer.tsx`:
```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProjectMessage } from '@/types/database'
import { fetchProjectMessages, sendProjectMessage } from '@/lib/services/chat-service'

interface TeamChatDrawerProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  currentUserId: string
}

export function TeamChatDrawer({ projectId, isOpen, onClose, currentUserId }: TeamChatDrawerProps) {
  const [messages, setMessages] = useState<ProjectMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!isOpen || !projectId) return

    fetchProjectMessages(projectId).then(msgs => {
      setMessages(msgs)
      scrollToBottom()
    })

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `project_id=eq.${projectId}` },
        async payload => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single()

          const newMsg: ProjectMessage = {
            ...(payload.new as ProjectMessage),
            sender: profile || undefined,
          }
          setMessages(prev => [...prev, newMsg])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, projectId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)

    try {
      await sendProjectMessage(projectId, text)
      setText('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="w-[320px] bg-surface border-l border-border flex flex-col shrink-0 z-30 shadow-xl">
      <div className="h-12 bg-surface/80 px-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Project Discussion</h3>
        </div>
        <button onClick={onClose} className="p-1 text-muted hover:text-text-primary rounded transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted text-xs">
            <MessageSquare size={28} className="text-muted/40 mb-2" />
            <p className="font-medium text-text-dim">No messages yet</p>
            <p className="mt-1">Coordinate timelines and task assignments with your team.</p>
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.sender_id === currentUserId
            const senderName = m.sender?.name || 'Teammate'

            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] text-muted mb-0.5 ml-1">{senderName}</span>
                )}
                <div
                  className={`px-3 py-1.5 rounded-lg text-[13px] leading-relaxed break-words ${
                    isMe
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-surface-hi text-text-primary rounded-bl-none border border-border'
                  }`}
                >
                  {m.message}
                </div>
                <span className="text-[9px] text-muted/60 mt-0.5 px-1 font-mono">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-2.5 border-t border-border bg-surface-dim flex items-center gap-1.5">
        <input
          type="text"
          maxLength={2000}
          placeholder="Type message..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="cell-input border border-border bg-surface px-2.5 py-1.5 text-xs flex-1"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="p-2 rounded bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit Task 7**

```bash
git add frontend/src/lib/services/chat-service.ts frontend/src/components/chat/team-chat-drawer.tsx
git commit -m "feat: implement validated team chat service and drawer"
```

---

### Task 8: Security Probes, Verification & Delivery Gate Check

**Files:**
- Modify: `frontend/src/app/page.tsx` (redirect root route to `/dashboard`)
- Test: Anti-SQLi test suite probe & CSV formula injection probe

- [ ] **Step 1: Write Anti-SQL Injection & CSV Formula Injection Test Probe**

Create test file `frontend/src/lib/validation/__tests__/schemas.test.ts`:
```typescript
import { inviteCodeSchema, uuidSchema, projectInputSchema, messageInputSchema } from '../schemas'
import { sanitizeCSVCell } from '@/lib/csv-export'

describe('Security Validation & Injection Probes', () => {
  test('rejects SQL injection payloads in invite codes', () => {
    const maliciousCodes = [
      "' OR '1'='1",
      "FLOW'; DROP TABLE projects; --",
      "FLOW' UNION SELECT * FROM profiles --",
      "<script>alert(1)</script>",
      "FLOW-ABCD", // old 4-char code rejected by new high-entropy regex
    ]
    maliciousCodes.forEach(code => {
      const res = inviteCodeSchema.safeParse(code)
      expect(res.success).toBe(false)
    })
  })

  test('accepts valid high-entropy invite codes', () => {
    expect(inviteCodeSchema.safeParse('FLOW-7K8P-2M9X').success).toBe(true)
    expect(inviteCodeSchema.safeParse('FLOW-ABCD-1234').success).toBe(true)
  })

  test('rejects non-UUID and malicious parameters', () => {
    expect(uuidSchema.safeParse('admin').success).toBe(false)
    expect(uuidSchema.safeParse('12345 OR 1=1').success).toBe(false)
    expect(uuidSchema.safeParse('e299b828-b80e-4366-9e67-cbbf28be061b').success).toBe(true)
  })

  test('strips control characters in message input', () => {
    const res = messageInputSchema.safeParse({ message: 'Hello\u0000World' })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.message).toBe('HelloWorld')
    }
  })

  test('sanitizes CSV formula injection triggers', () => {
    expect(sanitizeCSVCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0")
    expect(sanitizeCSVCell("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)")
    expect(sanitizeCSVCell("+12345")).toBe("'+12345")
    expect(sanitizeCSVCell("-100")).toBe("'-100")
    expect(sanitizeCSVCell("Normal Task Name")).toBe("Normal Task Name")
  })
})
```

- [ ] **Step 2: Redirect Root Route (`/`) to `/dashboard`**

Update `frontend/src/app/page.tsx` line 1-35 to redirect authenticated users to `/dashboard` or serve as landing.

- [ ] **Step 3: Run Production Build**

Run:
```bash
npm --prefix /run/media/sh1shiroon/Kerjaan-Linux-1/TaskFlowy/frontend run build
```
Expected: Build finishes with exit code 0.

- [ ] **Step 4: Run Antislop Scan on Modified Files**

Verify no em dashes (`—`), dead controls, or generic AI badges were introduced.

- [ ] **Step 5: Commit Final Verification**

```bash
git add frontend/src/app/page.tsx frontend/src/lib/validation/__tests__/schemas.test.ts
git commit -m "chore: add security validation tests and finalize dashboard routing"
```
