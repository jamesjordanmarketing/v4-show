# Iteration 8: LoRA Training Platform - Vite to Next.js 14 Conversion with Full Backend Integration

**Document Version:** 1.0  
**Date:** December 20, 2024  
**Target Framework:** Next.js 14 with App Router  
**Backend:** Supabase (PostgreSQL + Edge Functions)  
**Frontend Foundation:** Existing Vite Wireframe Application

---

## Executive Summary

This specification provides complete instructions for converting a comprehensive AI model training platform from a Vite-based wireframe application to a fully functional Next.js 14 application with Supabase backend integration. The platform implements a complete 7-stage workflow covering job configuration, monitoring, error handling, model artifacts, training comparison, quality validation, and cost management.

The source wireframe application is feature-complete on the frontend with mock data, unified navigation, and all UI components in place. Your task is to:

1. **Convert the Vite + React Router architecture to Next.js 14 App Router**
2. **Implement a full Supabase backend** with PostgreSQL database, Edge Functions, and real-time subscriptions
3. **Connect all frontend pages to functional backend APIs**
4. **Maintain the existing UI/UX** while making it fully operational
5. **Ensure data persistence, authentication, and real-time updates**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Current State Analysis](#2-current-state-analysis)
3. [Conversion Strategy](#3-conversion-strategy)
4. [Database Schema](#4-database-schema)
5. [Backend API Specifications](#5-backend-api-specifications)
6. [Frontend Migration Guide](#6-frontend-migration-guide)
7. [Feature Implementation Details](#7-feature-implementation-details)
8. [Real-time Subscriptions](#8-real-time-subscriptions)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Testing & Validation](#10-testing--validation)
11. [Deployment Considerations](#11-deployment-considerations)

---

## 1. Architecture Overview

### 1.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│  Next.js 14 App Router + React 18 + Tailwind CSS           │
│  • Server Components (default)                              │
│  • Client Components ('use client' where needed)            │
│  • Shadcn UI Components (40+ components)                    │
│  • Zustand for Client-Side State                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS / WebSocket
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  Supabase Platform                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  PostgreSQL Database (Persistent Storage)          │    │
│  │  • training_files                                   │    │
│  │  • conversations                                    │    │
│  │  • training_jobs                                    │    │
│  │  • job_configurations                               │    │
│  │  • training_metrics                                 │    │
│  │  • event_logs                                       │    │
│  │  • model_artifacts                                  │    │
│  │  • validation_results                               │    │
│  │  • cost_tracking                                    │    │
│  │  • user_profiles                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Edge Functions (Serverless API - Deno Runtime)    │    │
│  │  • Job Management APIs                              │    │
│  │  • Metrics Collection                               │    │
│  │  • Cost Calculation                                 │    │
│  │  • Validation Orchestration                         │    │
│  │  • File Processing                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Real-time Subscriptions                            │    │
│  │  • Job Status Changes                               │    │
│  │  • Metrics Updates                                  │    │
│  │  • Event Logs                                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Authentication & Authorization                     │    │
│  │  • Supabase Auth (Email + OAuth)                    │    │
│  │  • Row-Level Security (RLS)                         │    │
│  │  • Role-Based Access Control                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Storage (Supabase Storage)                         │    │
│  │  • Training Files (JSON/CSV)                        │    │
│  │  • Model Artifacts (.safetensors, .bin)             │    │
│  │  • Metrics Reports (PDF/CSV)                        │    │
│  │  • Validation Reports                               │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                   │
                   │ External Integration (Optional)
                   │
┌──────────────────▼──────────────────────────────────────────┐
│            External Training Infrastructure                 │
│  • GPU Provisioning Service (AWS, GCP, etc.)                │
│  • Training Orchestration                                   │
│  • Model Storage                                            │
│  • Webhook Callbacks to Supabase Edge Functions             │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Conversion

| Layer | Current (Vite) | Target (Next.js 14) |
|-------|---------------|---------------------|
| **Framework** | Vite 6.3 | Next.js 14 (App Router) |
| **Routing** | React Router DOM 7 | Next.js App Router (file-based) |
| **Rendering** | Client-Side Only (SPA) | Hybrid (Server Components + Client Components) |
| **API Layer** | Mock Supabase Edge Function | Real Supabase Edge Functions + Server Actions |
| **State Management** | Zustand 5.0 | Zustand 5.0 (client-side) + Server State (React Query/SWR) |
| **Styling** | Tailwind CSS 4.1 | Tailwind CSS 4.1 (same) |
| **UI Components** | Shadcn UI (Radix) | Shadcn UI (Radix) - same |
| **Backend** | Mock Data (KV Store) | PostgreSQL + Edge Functions |
| **Real-time** | None | Supabase Real-time Subscriptions |
| **Auth** | None (stub) | Supabase Auth |
| **File Storage** | Mock paths | Supabase Storage |
| **Build Tool** | Vite | Next.js (Turbopack/Webpack) |

### 1.3 Directory Structure Transformation

**Current Vite Structure:**
```
/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Router configuration
│   │   ├── pages/                     # Page components
│   │   └── components/                # React components
│   ├── store/                         # Zustand stores
│   ├── lib/                           # Utilities
│   ├── mocks/                         # Mock data
│   └── styles/                        # CSS files
├── supabase/
│   └── functions/                     # Mock Edge Functions
└── index.html                         # Entry point
```

**Target Next.js 14 Structure:**
```
/
├── app/                               # Next.js App Router
│   ├── layout.tsx                     # Root layout (replaces MainLayout)
│   ├── page.tsx                       # Dashboard home (/)
│   ├── training/                      # Training section
│   │   ├── jobs/
│   │   │   └── page.tsx              # /training/jobs
│   │   ├── job/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # /training/job/[id]
│   │   ├── create/
│   │   │   └── page.tsx              # /training/create
│   │   ├── [jobId]/
│   │   │   └── configure/
│   │   │       └── page.tsx          # /training/[jobId]/configure
│   │   ├── history/
│   │   │   └── page.tsx              # /training/history
│   │   ├── compare/
│   │   │   └── page.tsx              # /training/compare
│   │   ├── templates/
│   │   │   └── page.tsx              # /training/templates
│   │   ├── error-scenarios/
│   │   │   └── page.tsx              # /training/error-scenarios
│   │   ├── storage/
│   │   │   └── page.tsx              # /training/storage
│   │   └── stage4-demo/
│   │       └── page.tsx              # /training/stage4-demo
│   ├── validation/
│   │   ├── dashboard/
│   │   │   └── page.tsx              # /validation/dashboard
│   │   └── demo/
│   │       └── page.tsx              # /validation/demo
│   ├── cost/
│   │   ├── budget/
│   │   │   └── page.tsx              # /cost/budget
│   │   ├── attribution/
│   │   │   └── page.tsx              # /cost/attribution
│   │   └── demo/
│   │       └── page.tsx              # /cost/demo
│   └── api/                           # Server-side API routes (optional)
│       └── [...]/
│           └── route.ts
├── components/                        # Shared React components
│   ├── training/                      # Training-specific components
│   ├── validation/                    # Validation components
│   ├── cost/                          # Cost components
│   ├── layout/                        # Layout components
│   └── ui/                            # Shadcn UI components
├── lib/                               # Utilities
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client
│   │   └── middleware.ts             # Auth middleware
│   ├── actions/                       # Server Actions
│   └── utils/                         # Helper functions
├── store/                             # Zustand stores (client-side only)
├── types/                             # TypeScript types
├── supabase/                          # Supabase configuration
│   ├── migrations/                    # Database migrations
│   ├── functions/                     # Edge Functions
│   └── config.toml                    # Supabase config
├── public/                            # Static assets
└── middleware.ts                      # Next.js middleware (auth)
```

---

## 2. Current State Analysis

### 2.1 Implemented Features (Frontend Only)

The existing Vite wireframe application includes:

#### **Stage 1: Job Configuration (FR1.1.1 & FR1.1.2)**
- ✅ Training file selection with searchable dropdown
- ✅ Metadata panel with quality metrics, scaffolding distribution, human review stats
- ✅ Eligibility validation (enrichment status, conversation count)
- ✅ Conversation preview modal
- ✅ Hyperparameter preset selection (Conservative, Balanced, Aggressive)
- ✅ Cost estimation panel with real-time updates
- ✅ GPU selection (Spot vs On-Demand)

#### **Stage 2: Job Execution & Monitoring**
- ✅ Active jobs list with real-time progress
- ✅ Job detail dashboard with metrics
- ✅ Stage progress indicators (preprocessing, model_loading, training, finalization)
- ✅ Loss curve charts (training/validation loss)
- ✅ Live metrics panel (GPU utilization, learning rate)
- ✅ Cost tracking with estimates
- ✅ Event log table
- ✅ Job cancellation modal
- ✅ Queue management UI

#### **Stage 3: Error Handling & Recovery**
- ✅ Error scenario demonstration pages
- ✅ Dataset errors (missing files, corrupted data)
- ✅ GPU provisioning errors (out of capacity, spot interruption)
- ✅ OOM (Out of Memory) errors
- ✅ Auto-retry mechanism UI
- ✅ Recovery configuration modal
- ✅ Manual intervention options

#### **Stage 4: Model Artifacts**
- ✅ Storage dashboard
- ✅ Artifact download UI
- ✅ Package contents modal
- ✅ Deployment options
- ✅ Sharing functionality

#### **Stage 5: Training Comparison**
- ✅ Side-by-side job comparison
- ✅ Hyperparameter diff visualization
- ✅ Metrics comparison charts
- ✅ Cost vs quality analysis
- ✅ Template creation from successful jobs

#### **Stage 6: Quality Validation**
- ✅ Combined quality scorecard
- ✅ Perplexity section
- ✅ Emotional Intelligence (EI) section
- ✅ Knowledge retention tests
- ✅ Voice/tone consistency
- ✅ Quality gate footer with recommendations
- ✅ Before/after comparison modals
- ✅ Export validation reports

#### **Stage 7: Cost Management**
- ✅ Budget dashboard with spending trends
- ✅ Per-job cost breakdown
- ✅ Spot instance savings calculations
- ✅ Budget alert banners
- ✅ Cost attribution by team/project
- ✅ Budget settings and increase requests

#### **Navigation & Layout**
- ✅ Unified sidebar navigation with nested menus
- ✅ Dashboard home page with quick actions
- ✅ Breadcrumb navigation
- ✅ Status badges and icons
- ✅ Responsive design (mobile, tablet, desktop)

### 2.2 Mock Data Structures

The application currently uses comprehensive mock data in `/src/mocks/` and `/mocks/`:

**Mock Data Files:**
- `trainingData.ts` - Training files and conversations (7 files, 18+ conversations)
- `trainingHistoryData.ts` - Historical training jobs
- `jobsData.ts` - Active/queued/completed jobs with metrics
- `metricsData.ts` - Time-series metrics data
- `eventsData.ts` - Event logs for jobs
- `artifactsData.ts` - Model artifacts metadata
- `comparisonData.ts` - Job comparison data
- `validationData.ts` - Quality validation results
- `costBudgetData.ts` - Cost tracking and budgets
- `presetData.ts` - Hyperparameter presets
- `gpuData.ts` - GPU availability and pricing
- `templateData.ts` - Job templates
- `errorRecoveryData.ts` - Error scenarios

### 2.3 Component Inventory

**Total Components: 52**

**Training Components (12):**
- SearchableDropdown, MetadataPanel, EligibilityIndicator, QualityBadge, PreviewModal, TemplateCreationModal, TemplateEditModal, TemplateDeleteModal, TemplateDetailsModal

**Monitoring Components (20+):**
- ProgressHeaderCard, StageProgressIndicator, LossCurveChart, MetricsPanel, CostTrackerPanel, EventLogTable, CancelJobModal, JobsTable, QueueCard, ActiveSlotsPanel

**Error Handling Components (10+):**
- ErrorModalFramework, DatasetErrorModal, GpuProvisioningErrorModal, OomErrorModal, SpotInterruptionRecovery, AutoRetryProgress, RecoveryFailureModal, RetryConfirmationModal, ResumeConfigurationModal

**Artifacts Components (5+):**
- ModelArtifactsSection, MetricsReportsSection, DeploymentSection, PackageContentsModal, DownloadProgressModal, ShareLinkModal

**Comparison Components:**
- (Embedded in compare page)

**Validation Components (8):**
- CombinedQualityScorecard, PerplexitySection, EISection, KnowledgeSection, VoiceSection, QualityGateFooter, BeforeAfterModal, ExportReportModal

**Cost Components (7):**
- BudgetSummaryCards, SpendingTrendGraph, PerJobBreakdownTable, BudgetAlertBanner, BudgetSettingsSection, BudgetIncreaseModal, CostAttributionFormSection, CostTrackerSidebar, SpotSavingsSection

**Layout Components (2):**
- MainLayout, Sidebar

**UI Components (40+):**
- All Shadcn components (Button, Card, Dialog, Table, etc.)

### 2.4 What's Missing (Backend Implementation)

❌ **Database:**
- No persistent storage (data resets on page refresh)
- No relational data model
- No user data isolation

❌ **Authentication:**
- No user login/logout
- No user profiles
- No authorization/permissions

❌ **Real-time Updates:**
- Simulated updates with setInterval
- No WebSocket connections
- No real-time metrics streaming

❌ **API Integration:**
- All API calls are mocked
- No actual HTTP requests to backend
- No error handling for network failures

❌ **File Storage:**
- No actual file uploads
- No file download functionality
- Training files and artifacts are simulated

❌ **External Integrations:**
- No GPU provisioning service integration
- No training orchestration
- No cost tracking from actual cloud providers

---

## 3. Conversion Strategy

### 3.1 Phase 1: Foundation Setup (Week 1)

**Objective:** Set up Next.js 14 project and Supabase backend

**Tasks:**
1. Initialize Next.js 14 project with App Router
2. Set up Supabase project (database, auth, storage)
3. Configure environment variables
4. Migrate Tailwind CSS and Shadcn UI components
5. Set up TypeScript configuration
6. Create base layout component

**Deliverables:**
- Next.js project with working dev server
- Supabase project with connection verified
- All UI components migrated and importable

### 3.2 Phase 2: Database Schema & Migrations (Week 1-2)

**Objective:** Design and implement complete database schema

**Tasks:**
1. Create database schema (see Section 4)
2. Write SQL migrations
3. Set up Row-Level Security (RLS) policies
4. Create database indexes for performance
5. Implement database triggers for automation
6. Seed initial data (presets, GPU configurations)

**Deliverables:**
- Complete PostgreSQL schema
- Migration files in `/supabase/migrations/`
- RLS policies enabled and tested
- Seed data script

### 3.3 Phase 3: Authentication Setup (Week 2)

**Objective:** Implement user authentication

**Tasks:**
1. Configure Supabase Auth providers
2. Create login/signup pages
3. Implement auth middleware
4. Set up user profile creation
5. Add auth guards to protected routes
6. Create user session management

**Deliverables:**
- Working login/signup flow
- Protected routes with auth checks
- User profile page

### 3.4 Phase 4: Backend API Implementation (Week 2-3)

**Objective:** Build all Edge Functions and Server Actions

**Tasks:**
1. Implement training file APIs
2. Implement job management APIs
3. Implement metrics collection APIs
4. Implement validation APIs
5. Implement cost tracking APIs
6. Set up error handling and logging

**Deliverables:**
- Edge Functions for all operations
- Server Actions for mutations
- API documentation

### 3.5 Phase 5: Frontend Migration (Week 3-4)

**Objective:** Convert all pages from Vite to Next.js

**Tasks:**
1. Convert routing (React Router → App Router)
2. Migrate pages to Next.js Server/Client Components
3. Update imports and file paths
4. Connect pages to real APIs
5. Implement data fetching patterns
6. Add loading and error states

**Deliverables:**
- All pages migrated to `/app/` directory
- Server Components for static content
- Client Components for interactive features
- Working data fetching

### 3.6 Phase 6: Real-time Features (Week 4)

**Objective:** Implement real-time subscriptions

**Tasks:**
1. Set up Supabase Real-time
2. Implement job status subscriptions
3. Implement metrics updates subscriptions
4. Implement event log subscriptions
5. Add optimistic UI updates
6. Handle reconnection logic

**Deliverables:**
- Real-time job monitoring
- Live metrics updates
- Real-time event logs

### 3.7 Phase 7: File Storage & Artifacts (Week 4-5)

**Objective:** Implement file upload/download

**Tasks:**
1. Configure Supabase Storage buckets
2. Implement training file upload
3. Implement model artifact storage
4. Implement file download
5. Add file validation and processing
6. Set up storage policies

**Deliverables:**
- Working file upload for training data
- Model artifact download functionality
- Secure file access

### 3.8 Phase 8: Testing & Optimization (Week 5)

**Objective:** Test and optimize the application

**Tasks:**
1. Write integration tests
2. Perform load testing
3. Optimize database queries
4. Implement caching strategies
5. Add error tracking (Sentry)
6. Performance optimization

**Deliverables:**
- Test suite with >80% coverage
- Performance benchmarks
- Production-ready application

---

## 4. Database Schema

### 4.1 Schema Design Principles

- **Normalization:** Use 3NF for data integrity
- **Performance:** Add indexes on foreign keys and frequently queried columns
- **Audit Trail:** Include `created_at`, `updated_at` on all tables
- **Soft Deletes:** Use `deleted_at` instead of hard deletes
- **JSON Storage:** Use `jsonb` for flexible metadata
- **Enums:** Use PostgreSQL enums for status fields

### 4.2 Core Tables

#### 4.2.1 `users` Table

Extends Supabase Auth `auth.users` table.

```sql
-- Note: This extends the built-in auth.users table via 1:1 relationship
-- Supabase Auth provides: id, email, created_at, etc.

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'operator')),
  organization_id UUID,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

#### 4.2.2 `training_files` Table

Stores uploaded training datasets.

```sql
CREATE TYPE enrichment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE TABLE public.training_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- File metadata
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT NOT NULL, -- Bytes
  mime_type TEXT,
  
  -- Conversation counts
  conversation_count INTEGER DEFAULT 0,
  training_pairs_count INTEGER DEFAULT 0,
  
  -- Quality scores
  average_quality_score DECIMAL(3,2),
  quality_scores JSONB DEFAULT '{}'::jsonb, -- {empathy, clarity, appropriateness}
  
  -- Scaffolding distribution
  scaffolding_distribution JSONB DEFAULT '{}'::jsonb,
  -- {personas: [], emotional_arcs: [], topics: []}
  
  -- Human review stats
  human_review JSONB DEFAULT '{}'::jsonb,
  -- {human_reviewed_count, ai_generated_count, percentages}
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  enrichment_status enrichment_status DEFAULT 'pending',
  enrichment_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_enriched_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_training_files_user_id ON public.training_files(user_id);
CREATE INDEX idx_training_files_status ON public.training_files(status);
CREATE INDEX idx_training_files_enrichment_status ON public.training_files(enrichment_status);

-- RLS Policies
ALTER TABLE public.training_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training files"
  ON public.training_files
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own training files"
  ON public.training_files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training files"
  ON public.training_files
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can soft-delete own training files"
  ON public.training_files
  FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 4.2.3 `conversations` Table

Stores individual conversations for preview and analysis.

```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_file_id UUID NOT NULL REFERENCES public.training_files(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  persona TEXT,
  emotional_arc TEXT,
  topic TEXT,
  quality_score DECIMAL(3,2),
  
  -- Messages (array of {role, content} objects)
  messages JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_training_file_id ON public.conversations(training_file_id);
CREATE INDEX idx_conversations_quality_score ON public.conversations(quality_score);

-- RLS Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations for their training files"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_files
      WHERE training_files.id = conversations.training_file_id
        AND training_files.user_id = auth.uid()
    )
  );
```

#### 4.2.4 `hyperparameter_presets` Table

Stores preset configurations.

```sql
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.hyperparameter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Icon identifier
  is_system BOOLEAN DEFAULT false, -- System presets can't be deleted
  
  -- Hyperparameters
  parameters JSONB NOT NULL,
  -- {rank, learning_rate, epochs, batch_size, gradient_accumulation_steps}
  
  -- Estimates
  estimates JSONB NOT NULL,
  -- {duration_hours_min, duration_hours_max, cost_spot_min, cost_spot_max, cost_ondemand_min, cost_ondemand_max}
  
  -- Risk and success rate
  risk_level risk_level DEFAULT 'medium',
  success_rate DECIMAL(5,2),
  completed_jobs INTEGER DEFAULT 0,
  
  -- Requirements
  requires_completed_jobs INTEGER DEFAULT 0,
  recommended_for TEXT[], -- Array of use cases
  
  -- Ownership
  created_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_presets_is_system ON public.hyperparameter_presets(is_system);

-- RLS Policies
ALTER TABLE public.hyperparameter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system presets"
  ON public.hyperparameter_presets
  FOR SELECT
  USING (is_system = true);

CREATE POLICY "Users can view own custom presets"
  ON public.hyperparameter_presets
  FOR SELECT
  USING (created_by = auth.uid());
```

#### 4.2.5 `training_jobs` Table

Core table for training jobs.

```sql
CREATE TYPE job_status AS ENUM (
  'draft',
  'configured',
  'queued',
  'provisioning',
  'training',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE gpu_type AS ENUM ('spot', 'ondemand');

CREATE TABLE public.training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- References
  training_file_id UUID NOT NULL REFERENCES public.training_files(id) ON DELETE RESTRICT,
  preset_id UUID REFERENCES public.hyperparameter_presets(id),
  
  -- Configuration
  gpu_type gpu_type,
  gpu_model TEXT,
  hyperparameters JSONB, -- Snapshot of parameters at job creation
  
  -- Status and progress
  status job_status DEFAULT 'draft',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  current_epoch INTEGER DEFAULT 0,
  total_epochs INTEGER,
  
  -- Current stage
  current_stage TEXT,
  stage_substatus TEXT,
  
  -- Queue info
  queue_position INTEGER,
  estimated_start_time TIMESTAMPTZ,
  
  -- Time tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  elapsed_seconds INTEGER DEFAULT 0,
  estimated_remaining_seconds INTEGER,
  
  -- Cost tracking
  current_cost DECIMAL(10,2) DEFAULT 0,
  estimated_cost_min DECIMAL(10,2),
  estimated_cost_max DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  
  -- Failure info
  error_message TEXT,
  failed_stage TEXT,
  
  -- Cancellation info
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  
  -- External system tracking
  external_job_id TEXT, -- ID from training infrastructure
  
  CONSTRAINT valid_progress CHECK (
    (status IN ('draft', 'configured', 'queued', 'provisioning') AND progress_percentage = 0) OR
    (status IN ('training', 'completed', 'failed', 'cancelled'))
  )
);

CREATE INDEX idx_training_jobs_user_id ON public.training_jobs(user_id);
CREATE INDEX idx_training_jobs_status ON public.training_jobs(status);
CREATE INDEX idx_training_jobs_training_file_id ON public.training_jobs(training_file_id);
CREATE INDEX idx_training_jobs_created_at ON public.training_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.training_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.training_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.training_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 4.2.6 `training_metrics` Table

Time-series metrics for training jobs.

```sql
CREATE TABLE public.training_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
  
  -- Metrics
  training_loss DECIMAL(10,6),
  validation_loss DECIMAL(10,6),
  learning_rate DECIMAL(12,10),
  gpu_utilization INTEGER CHECK (gpu_utilization >= 0 AND gpu_utilization <= 100),
  memory_used_gb DECIMAL(10,2),
  
  -- Step info
  step INTEGER NOT NULL,
  epoch INTEGER,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_training_metrics_job_id ON public.training_metrics(job_id);
CREATE INDEX idx_training_metrics_job_id_step ON public.training_metrics(job_id, step);
CREATE INDEX idx_training_metrics_recorded_at ON public.training_metrics(recorded_at);

-- RLS Policies
ALTER TABLE public.training_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for their jobs"
  ON public.training_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_jobs
      WHERE training_jobs.id = training_metrics.job_id
        AND training_jobs.user_id = auth.uid()
    )
  );
```

#### 4.2.7 `event_logs` Table

Event logs for auditing and monitoring.

```sql
CREATE TYPE event_type AS ENUM (
  'status',
  'metrics',
  'warning',
  'error',
  'checkpoint',
  'info'
);

CREATE TABLE public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
  
  -- Event details
  event_type event_type NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  details JSONB,
  
  -- Metadata
  source TEXT, -- e.g., 'training_orchestrator', 'gpu_monitor'
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_logs_job_id ON public.event_logs(job_id);
CREATE INDEX idx_event_logs_created_at ON public.event_logs(created_at DESC);
CREATE INDEX idx_event_logs_event_type ON public.event_logs(event_type);

-- RLS Policies
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their jobs"
  ON public.event_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_jobs
      WHERE training_jobs.id = event_logs.job_id
        AND training_jobs.user_id = auth.uid()
    )
  );
```

#### 4.2.8 `model_artifacts` Table

Stores metadata for trained models and checkpoints.

```sql
CREATE TYPE artifact_type AS ENUM (
  'final_model',
  'checkpoint',
  'adapter_weights',
  'training_report',
  'metrics_export',
  'validation_report'
);

CREATE TABLE public.model_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
  
  -- Artifact details
  artifact_type artifact_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- File metadata
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  checksum TEXT, -- SHA256 hash
  
  -- Version info
  version TEXT,
  epoch INTEGER,
  step INTEGER,
  
  -- Metrics snapshot
  metrics JSONB,
  
  -- Download tracking
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_model_artifacts_job_id ON public.model_artifacts(job_id);
CREATE INDEX idx_model_artifacts_type ON public.model_artifacts(artifact_type);

-- RLS Policies
ALTER TABLE public.model_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view artifacts for their jobs"
  ON public.model_artifacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_jobs
      WHERE training_jobs.id = model_artifacts.job_id
        AND training_jobs.user_id = auth.uid()
    )
  );
```

#### 4.2.9 `validation_results` Table

Quality validation test results.

```sql
CREATE TYPE validation_status AS ENUM (
  'production_ready',
  'review_required',
  'blocked'
);

CREATE TABLE public.validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
  
  -- Overall status
  overall_status validation_status NOT NULL,
  overall_score DECIMAL(5,2),
  
  -- Test results (detailed JSONB)
  perplexity_results JSONB,
  emotional_intelligence_results JSONB,
  knowledge_retention_results JSONB,
  voice_consistency_results JSONB,
  
  -- Quality gates
  passed_gates TEXT[],
  failed_gates TEXT[],
  warning_gates TEXT[],
  
  -- Recommendations
  recommendations JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  validation_completed_at TIMESTAMPTZ
);

CREATE INDEX idx_validation_results_job_id ON public.validation_results(job_id);
CREATE INDEX idx_validation_results_status ON public.validation_results(overall_status);

-- RLS Policies
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validation results for their jobs"
  ON public.validation_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_jobs
      WHERE training_jobs.id = validation_results.job_id
        AND training_jobs.user_id = auth.uid()
    )
  );
```

#### 4.2.10 `cost_tracking` Table

Detailed cost tracking per job.

```sql
CREATE TABLE public.cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
  
  -- Cost breakdown
  compute_cost DECIMAL(10,2) DEFAULT 0,
  storage_cost DECIMAL(10,2) DEFAULT 0,
  network_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Billing details
  gpu_hours DECIMAL(10,4),
  spot_savings DECIMAL(10,2) DEFAULT 0,
  
  -- Attribution
  team TEXT,
  project TEXT,
  cost_center TEXT,
  tags JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cost_tracking_job_id ON public.cost_tracking(job_id);
CREATE INDEX idx_cost_tracking_team ON public.cost_tracking(team);
CREATE INDEX idx_cost_tracking_project ON public.cost_tracking(project);

-- RLS Policies
ALTER TABLE public.cost_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost tracking for their jobs"
  ON public.cost_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_jobs
      WHERE training_jobs.id = cost_tracking.job_id
        AND training_jobs.user_id = auth.uid()
    )
  );
```

#### 4.2.11 `budgets` Table

Budget management.

```sql
CREATE TYPE budget_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annual');

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Budget details
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  period budget_period NOT NULL,
  
  -- Alerts
  alert_threshold DECIMAL(5,2) DEFAULT 80, -- Percentage
  alert_enabled BOOLEAN DEFAULT true,
  
  -- Tracking
  current_spend DECIMAL(10,2) DEFAULT 0,
  
  -- Attribution filters
  team TEXT,
  project TEXT,
  cost_center TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
);

CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_is_active ON public.budgets(is_active);

-- RLS Policies
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets"
  ON public.budgets
  FOR ALL
  USING (auth.uid() = user_id);
```

#### 4.2.12 `job_templates` Table

Reusable job configurations.

```sql
CREATE TABLE public.job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  
  -- Configuration snapshot
  preset_id UUID REFERENCES public.hyperparameter_presets(id),
  hyperparameters JSONB,
  gpu_type gpu_type,
  
  -- Source job (if created from existing job)
  source_job_id UUID REFERENCES public.training_jobs(id),
  
  -- Stats
  use_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_cost DECIMAL(10,2),
  avg_duration_hours DECIMAL(10,2),
  
  -- Sharing
  is_public BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_job_templates_user_id ON public.job_templates(user_id);
CREATE INDEX idx_job_templates_is_public ON public.job_templates(is_public);

-- RLS Policies
ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON public.job_templates
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage own templates"
  ON public.job_templates
  FOR ALL
  USING (auth.uid() = user_id);
```

### 4.3 Database Functions and Triggers

#### 4.3.1 Updated Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_files_updated_at
  BEFORE UPDATE ON public.training_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ... repeat for other tables
```

#### 4.3.2 User Profile Creation Trigger

```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

#### 4.3.3 Cost Tracking Update Trigger

```sql
CREATE OR REPLACE FUNCTION update_job_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate elapsed time and cost
  IF NEW.status = 'training' AND NEW.started_at IS NOT NULL THEN
    NEW.elapsed_seconds = EXTRACT(EPOCH FROM (now() - NEW.started_at))::INTEGER;
    NEW.current_cost = (NEW.elapsed_seconds / 3600.0) * NEW.hourly_rate;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_training_job_cost
  BEFORE UPDATE ON public.training_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'training')
  EXECUTE FUNCTION update_job_cost();
```

### 4.4 Database Seed Data

Create a seed script to populate initial data:

```sql
-- supabase/migrations/seed.sql

-- Seed hyperparameter presets
INSERT INTO public.hyperparameter_presets (id, name, description, icon, is_system, parameters, estimates, risk_level, success_rate, recommended_for, requires_completed_jobs)
VALUES
(
  gen_random_uuid(),
  'Conservative',
  'Safe, proven configuration for first training runs',
  'shield',
  true,
  '{"rank": 8, "learning_rate": 0.0001, "epochs": 2, "batch_size": 4, "gradient_accumulation_steps": 1}'::jsonb,
  '{"duration_hours_min": 8, "duration_hours_max": 10, "cost_spot_min": 25, "cost_spot_max": 30, "cost_ondemand_min": 80, "cost_ondemand_max": 120}'::jsonb,
  'low',
  98.0,
  ARRAY['First training run', 'High-quality seed data', 'Budget-conscious', 'Quick validation'],
  0
),
(
  gen_random_uuid(),
  'Balanced',
  'Recommended for most production use cases',
  'scales',
  true,
  '{"rank": 16, "learning_rate": 0.0002, "epochs": 3, "batch_size": 2, "gradient_accumulation_steps": 2}'::jsonb,
  '{"duration_hours_min": 12, "duration_hours_max": 15, "cost_spot_min": 50, "cost_spot_max": 60, "cost_ondemand_min": 120, "cost_ondemand_max": 140}'::jsonb,
  'medium',
  96.0,
  ARRAY['Production models', 'Proven reliability', 'Standard datasets', 'Client delivery'],
  0
),
(
  gen_random_uuid(),
  'Aggressive',
  'Maximum quality for complex use cases',
  'rocket',
  true,
  '{"rank": 32, "learning_rate": 0.0003, "epochs": 4, "batch_size": 1, "gradient_accumulation_steps": 4}'::jsonb,
  '{"duration_hours_min": 18, "duration_hours_max": 20, "cost_spot_min": 80, "cost_spot_max": 100, "cost_ondemand_min": 200, "cost_ondemand_max": 240}'::jsonb,
  'high',
  92.0,
  ARRAY['Complex emotional intelligence', 'Maximum quality', 'Research/experimentation', 'When budget allows'],
  3
);
```

---

## 5. Backend API Specifications

### 5.1 Supabase Edge Functions Overview

Create the following Edge Functions in `/supabase/functions/`:

1. **training-files** - CRUD operations for training files
2. **training-jobs** - Job management (create, update, cancel)
3. **job-metrics** - Metrics collection and retrieval
4. **job-events** - Event log management
5. **artifacts** - Model artifact operations
6. **validation** - Quality validation orchestration
7. **cost-tracking** - Cost calculation and tracking
8. **templates** - Job template management

### 5.2 Edge Function: `training-files`

**File:** `/supabase/functions/training-files/index.ts`

**Endpoints:**

#### GET `/training-files`

List all training files for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by status (active, archived)
- `enrichment_status` (optional): Filter by enrichment status
- `search` (optional): Search by name
- `limit` (optional): Number of results (default 50)
- `offset` (optional): Pagination offset

**Response:**
```typescript
{
  data: TrainingFile[],
  count: number,
  page: number,
  total_pages: number
}
```

#### GET `/training-files/:id`

Get a specific training file with full metadata.

**Response:**
```typescript
{
  id: string,
  name: string,
  conversation_count: number,
  quality_scores: {
    empathy: number,
    clarity: number,
    appropriateness: number
  },
  scaffolding_distribution: {
    personas: Array<{type: string, count: number, percentage: number}>,
    emotional_arcs: Array<{type: string, count: number, percentage: number}>,
    topics: Array<{category: string, count: number, percentage: number}>
  },
  // ... other fields
}
```

#### POST `/training-files/upload`

Upload a new training file.

**Request Body (multipart/form-data):**
- `file`: File upload
- `name`: File name
- `description`: Optional description

**Process:**
1. Validate file format (JSON/CSV)
2. Upload to Supabase Storage
3. Create database record with `enrichment_status='pending'`
4. Trigger background enrichment job
5. Return file metadata

**Response:**
```typescript
{
  id: string,
  name: string,
  status: 'active',
  enrichment_status: 'pending',
  // ... other fields
}
```

#### GET `/training-files/:id/conversations`

Get sample conversations for preview.

**Query Parameters:**
- `limit` (optional): Number of conversations (default 5)
- `quality_min` (optional): Minimum quality score filter

**Response:**
```typescript
{
  data: Conversation[],
  count: number
}
```

**Implementation Example:**

```typescript
// supabase/functions/training-files/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const url = new URL(req.url);
  const path = url.pathname.replace('/training-files', '');
  const method = req.method;

  // GET /training-files
  if (method === 'GET' && path === '') {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const status = url.searchParams.get('status') || 'active';
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabaseClient
      .from('training_files')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({
        data,
        count,
        page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil((count || 0) / limit)
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // GET /training-files/:id
  if (method === 'GET' && path.match(/^\/[a-f0-9-]+$/)) {
    const id = path.slice(1);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data, error } = await supabaseClient
      .from('training_files')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 404 });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // GET /training-files/:id/conversations
  if (method === 'GET' && path.match(/^\/[a-f0-9-]+\/conversations$/)) {
    const id = path.split('/')[1];
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const quality_min = parseFloat(url.searchParams.get('quality_min') || '0');

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    // Verify ownership
    const { data: file } = await supabaseClient
      .from('training_files')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!file) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }

    let query = supabaseClient
      .from('conversations')
      .select('*')
      .eq('training_file_id', id)
      .order('quality_score', { ascending: false })
      .limit(limit);

    if (quality_min > 0) {
      query = query.gte('quality_score', quality_min);
    }

    const { data, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ data, count }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // POST /training-files/upload
  if (method === 'POST' && path === '/upload') {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${crypto.randomUUID()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('training-files')
      .upload(fileName, file);

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
    }

    // Create database record
    const { data: fileRecord, error: dbError } = await supabaseClient
      .from('training_files')
      .insert({
        user_id: user.id,
        name: name || file.name,
        description,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        status: 'active',
        enrichment_status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage upload
      await supabaseClient.storage.from('training-files').remove([fileName]);
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
    }

    // TODO: Trigger enrichment job (via webhook or separate function)

    return new Response(JSON.stringify(fileRecord), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
});
```

### 5.3 Edge Function: `training-jobs`

**File:** `/supabase/functions/training-jobs/index.ts`

**Endpoints:**

#### POST `/training-jobs`

Create a new training job.

**Request Body:**
```typescript
{
  training_file_id: string,
  name: string,
  description?: string
}
```

**Process:**
1. Validate training file exists and is eligible
2. Create job record with status='draft'
3. Return job ID for configuration

**Response:**
```typescript
{
  id: string,
  name: string,
  status: 'draft',
  training_file_id: string,
  created_at: string
}
```

#### PUT `/training-jobs/:id/configure`

Configure job hyperparameters and GPU selection.

**Request Body:**
```typescript
{
  preset_id?: string,
  hyperparameters?: object,
  gpu_type: 'spot' | 'ondemand',
  gpu_model: string
}
```

**Process:**
1. Validate job is in 'draft' status
2. Update job configuration
3. Calculate cost estimates
4. Update status to 'configured'

**Response:**
```typescript
{
  id: string,
  status: 'configured',
  hyperparameters: object,
  estimated_cost_min: number,
  estimated_cost_max: number,
  // ... other fields
}
```

#### POST `/training-jobs/:id/start`

Start a configured training job.

**Process:**
1. Validate job is 'configured'
2. Check GPU availability
3. Either:
   - Start immediately (status='provisioning')
   - Or add to queue (status='queued', set queue_position)
4. Call external training infrastructure API
5. Store external_job_id
6. Return updated job

**Response:**
```typescript
{
  id: string,
  status: 'queued' | 'provisioning',
  queue_position?: number,
  estimated_start_time?: string,
  // ... other fields
}
```

#### POST `/training-jobs/:id/cancel`

Cancel a running or queued job.

**Request Body:**
```typescript
{
  reason: string
}
```

**Process:**
1. Validate job can be cancelled (queued, provisioning, or training)
2. Call external API to stop job
3. Update job status to 'cancelled'
4. Calculate final cost
5. Create event log entry

**Response:**
```typescript
{
  id: string,
  status: 'cancelled',
  cancelled_reason: string,
  cancelled_at: string,
  final_cost: number
}
```

#### GET `/training-jobs`

List jobs for authenticated user.

**Query Parameters:**
- `status`: Filter by status
- `limit`: Number of results
- `offset`: Pagination offset

**Response:**
```typescript
{
  data: TrainingJob[],
  count: number
}
```

#### GET `/training-jobs/:id`

Get job details including current metrics.

**Response:**
```typescript
{
  id: string,
  name: string,
  status: string,
  progress_percentage: number,
  current_metrics: {
    training_loss: number,
    validation_loss: number,
    gpu_utilization: number,
    // ...
  },
  // ... all job fields
}
```

### 5.4 Edge Function: `job-metrics`

**File:** `/supabase/functions/job-metrics/index.ts`

**Endpoints:**

#### POST `/job-metrics/:job_id`

Record new metrics (called by training infrastructure).

**Request Body:**
```typescript
{
  training_loss: number,
  validation_loss: number,
  learning_rate: number,
  gpu_utilization: number,
  memory_used_gb: number,
  step: number,
  epoch: number
}
```

**Process:**
1. Validate job exists
2. Insert metrics record
3. Update job progress
4. Publish real-time update via Supabase Realtime

**Response:**
```typescript
{
  success: true,
  metrics_id: string
}
```

#### GET `/job-metrics/:job_id`

Get metrics history for a job.

**Query Parameters:**
- `limit`: Number of points (default 100)
- `interval`: Sampling interval in steps (default 1)

**Response:**
```typescript
{
  data: Array<{
    step: number,
    epoch: number,
    training_loss: number,
    validation_loss: number,
    learning_rate: number,
    gpu_utilization: number,
    recorded_at: string
  }>
}
```

#### GET `/job-metrics/:job_id/latest`

Get the latest metrics for a job.

**Response:**
```typescript
{
  training_loss: number,
  validation_loss: number,
  learning_rate: number,
  gpu_utilization: number,
  memory_used_gb: number,
  step: number,
  epoch: number,
  recorded_at: string
}
```

### 5.5 Edge Function: `job-events`

**File:** `/supabase/functions/job-events/index.ts`

**Endpoints:**

#### POST `/job-events/:job_id`

Create an event log entry (called by training infrastructure).

**Request Body:**
```typescript
{
  event_type: 'status' | 'metrics' | 'warning' | 'error' | 'checkpoint' | 'info',
  severity: 'info' | 'warning' | 'error' | 'critical',
  message: string,
  details?: object,
  source?: string
}
```

**Process:**
1. Insert event log record
2. If severity is 'error' or 'critical', check for auto-retry logic
3. Publish real-time update

**Response:**
```typescript
{
  success: true,
  event_id: string
}
```

#### GET `/job-events/:job_id`

Get event logs for a job.

**Query Parameters:**
- `event_type`: Filter by type
- `severity`: Filter by severity
- `limit`: Number of events (default 50)
- `offset`: Pagination offset

**Response:**
```typescript
{
  data: EventLog[],
  count: number
}
```

### 5.6 Edge Function: `artifacts`

**File:** `/supabase/functions/artifacts/index.ts`

**Endpoints:**

#### POST `/artifacts/:job_id`

Upload a model artifact (called by training infrastructure).

**Request Body (multipart/form-data):**
- `file`: Artifact file
- `artifact_type`: Type of artifact
- `name`: Artifact name
- `version`: Optional version
- `epoch`: Optional epoch number
- `step`: Optional step number
- `metrics`: Optional JSON metrics snapshot

**Process:**
1. Validate job exists and belongs to user
2. Upload file to Supabase Storage
3. Calculate checksum (SHA256)
4. Create artifact record in database

**Response:**
```typescript
{
  id: string,
  artifact_type: string,
  name: string,
  file_path: string,
  file_size: number,
  checksum: string
}
```

#### GET `/artifacts/:job_id`

List artifacts for a job.

**Query Parameters:**
- `artifact_type`: Filter by type

**Response:**
```typescript
{
  data: ModelArtifact[]
}
```

#### GET `/artifacts/:artifact_id/download`

Generate a signed URL for downloading an artifact.

**Response:**
```typescript
{
  download_url: string,
  expires_at: string
}
```

**Process:**
1. Validate artifact exists and user has access
2. Generate signed URL (valid for 1 hour)
3. Increment download counter
4. Update last_downloaded_at timestamp

### 5.7 Edge Function: `validation`

**File:** `/supabase/functions/validation/index.ts`

**Endpoints:**

#### POST `/validation/:job_id/run`

Trigger validation tests for a completed job.

**Request Body:**
```typescript
{
  test_suites: string[], // ['perplexity', 'emotional_intelligence', 'knowledge_retention', 'voice_consistency']
  comparison_baseline?: string // Job ID to compare against
}
```

**Process:**
1. Validate job is completed
2. Retrieve model artifacts
3. Run validation tests (async)
4. Store results in validation_results table
5. Return validation ID

**Response:**
```typescript
{
  validation_id: string,
  status: 'running',
  estimated_completion: string
}
```

#### GET `/validation/:job_id`

Get validation results for a job.

**Response:**
```typescript
{
  id: string,
  job_id: string,
  overall_status: 'production_ready' | 'review_required' | 'blocked',
  overall_score: number,
  perplexity_results: object,
  emotional_intelligence_results: object,
  knowledge_retention_results: object,
  voice_consistency_results: object,
  passed_gates: string[],
  failed_gates: string[],
  warning_gates: string[],
  recommendations: object,
  validation_completed_at: string
}
```

#### POST `/validation/:validation_id/export`

Export validation report.

**Request Body:**
```typescript
{
  format: 'pdf' | 'csv' | 'json'
}
```

**Process:**
1. Retrieve validation data
2. Generate report in requested format
3. Upload to Supabase Storage
4. Return download URL

**Response:**
```typescript
{
  download_url: string,
  file_name: string,
  file_size: number
}
```

### 5.8 Edge Function: `cost-tracking`

**File:** `/supabase/functions/cost-tracking/index.ts`

**Endpoints:**

#### POST `/cost-tracking/:job_id`

Update cost tracking for a job (called periodically by training infrastructure).

**Request Body:**
```typescript
{
  compute_cost: number,
  storage_cost: number,
  network_cost: number,
  gpu_hours: number,
  team?: string,
  project?: string,
  cost_center?: string,
  tags?: object
}
```

**Process:**
1. Upsert cost_tracking record
2. Calculate spot savings if applicable
3. Update job's current_cost field
4. Check budget alerts

**Response:**
```typescript
{
  success: true,
  total_cost: number,
  spot_savings: number
}
```

#### GET `/cost-tracking/summary`

Get cost summary for authenticated user.

**Query Parameters:**
- `period`: 'day' | 'week' | 'month' | 'quarter' | 'year'
- `start_date`: ISO date string
- `end_date`: ISO date string
- `team`: Filter by team
- `project`: Filter by project

**Response:**
```typescript
{
  total_cost: number,
  compute_cost: number,
  storage_cost: number,
  network_cost: number,
  total_gpu_hours: number,
  total_spot_savings: number,
  job_count: number,
  breakdown_by_job: Array<{
    job_id: string,
    job_name: string,
    total_cost: number,
    gpu_hours: number
  }>
}
```

#### GET `/cost-tracking/trends`

Get cost trends over time.

**Query Parameters:**
- `period`: 'day' | 'week' | 'month'
- `start_date`: ISO date string
- `end_date`: ISO date string

**Response:**
```typescript
{
  data: Array<{
    date: string,
    total_cost: number,
    compute_cost: number,
    job_count: number
  }>
}
```

### 5.9 Edge Function: `templates`

**File:** `/supabase/functions/templates/index.ts`

**Endpoints:**

#### POST `/templates`

Create a job template.

**Request Body:**
```typescript
{
  name: string,
  description?: string,
  icon?: string,
  preset_id: string,
  hyperparameters: object,
  gpu_type: 'spot' | 'ondemand',
  source_job_id?: string,
  is_public?: boolean
}
```

**Response:**
```typescript
{
  id: string,
  name: string,
  description: string,
  // ... other fields
}
```

#### GET `/templates`

List templates (user's own + public templates).

**Query Parameters:**
- `is_public`: Filter by public/private
- `search`: Search by name

**Response:**
```typescript
{
  data: JobTemplate[]
}
```

#### POST `/templates/:id/use`

Create a job from a template.

**Request Body:**
```typescript
{
  training_file_id: string,
  name: string
}
```

**Process:**
1. Retrieve template
2. Create new job with template configuration
3. Increment template use_count
4. Return new job

**Response:**
```typescript
{
  job_id: string,
  job_name: string,
  status: 'draft'
}
```

---

## 6. Frontend Migration Guide

### 6.1 File-by-File Migration Map

**Current Vite Structure → Next.js 14 Structure**

| Current Vite Path | Next.js 14 Path | Notes |
|-------------------|-----------------|-------|
| `/src/app/App.tsx` | `/app/layout.tsx` | Convert router to layout |
| `/src/app/pages/dashboard/home.tsx` | `/app/page.tsx` | Root page (/) |
| `/src/app/pages/training-jobs/create.tsx` | `/app/training/create/page.tsx` | Training creation page |
| `/src/app/pages/training-jobs/configure.tsx` | `/app/training/[jobId]/configure/page.tsx` | Dynamic route |
| `/src/app/pages/training-jobs/history.tsx` | `/app/training/history/page.tsx` | History page |
| `/src/app/pages/training-jobs/compare.tsx` | `/app/training/compare/page.tsx` | Comparison page |
| `/src/app/pages/training-jobs/templates.tsx` | `/app/training/templates/page.tsx` | Templates page |
| `/app/dashboard/training-jobs/page.tsx` | `/app/training/jobs/page.tsx` | Jobs list |
| `/app/training-jobs/[id]/page.tsx` | `/app/training/job/[id]/page.tsx` | Job detail |
| `/app/training-jobs/error-scenarios/page.tsx` | `/app/training/error-scenarios/page.tsx` | Error demos |
| `/app/training-jobs/storage/page.tsx` | `/app/training/storage/page.tsx` | Storage dashboard |
| `/app/training-jobs/stage4-demo/page.tsx` | `/app/training/stage4-demo/page.tsx` | Stage 4 demo |
| `/src/app/pages/validation/dashboard.tsx` | `/app/validation/dashboard/page.tsx` | Validation dashboard |
| `/src/app/pages/validation/demo.tsx` | `/app/validation/demo/page.tsx` | Validation demo |
| `/src/app/pages/cost/budget-dashboard.tsx` | `/app/cost/budget/page.tsx` | Budget dashboard |
| `/src/app/pages/cost/attribution.tsx` | `/app/cost/attribution/page.tsx` | Cost attribution |
| `/src/app/pages/cost/demo.tsx` | `/app/cost/demo/page.tsx` | Cost demo |
| `/src/app/components/**/*` | `/components/**/*` | Move to root-level components |
| `/src/store/**/*` | `/store/**/*` | Move to root-level store |
| `/src/lib/**/*` | `/lib/**/*` | Move to root-level lib |
| `/src/styles/**/*` | `/styles/**/*` OR `/app/globals.css` | Global styles |

### 6.2 Root Layout Implementation

**File:** `/app/layout.tsx`

```typescript
import { Sidebar } from '@/components/layout/sidebar';
import { Toaster } from '@/components/ui/sonner';
import '@/styles/globals.css';

export const metadata = {
  title: 'AI Training Platform',
  description: 'Comprehensive AI model training and management platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            {children}
          </main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
```

### 6.3 Server vs Client Components Strategy

**Server Components (Default):**
- Pages that fetch data (use `async` functions)
- Static content
- Layout components
- Data-heavy pages (job lists, history)

**Client Components (`'use client'`):**
- Interactive forms
- Components with useState, useEffect
- Components using browser APIs
- Modal dialogs
- Real-time subscriptions
- Zustand store consumers

**Example Conversion: Dashboard Home Page**

**Before (Vite):**
```typescript
// /src/app/pages/dashboard/home.tsx
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function DashboardHome() {
  const stats = {
    activeJobs: 3,
    completedToday: 5,
    // ... mock data
  };

  return (
    <div className="p-8 space-y-8">
      <h1>Training Platform Dashboard</h1>
      {/* ... rest of UI */}
    </div>
  );
}
```

**After (Next.js 14 - Server Component):**
```typescript
// /app/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getJobStats } from '@/lib/actions/jobs';

export default async function DashboardPage() {
  // Fetch data server-side
  const stats = await getJobStats();

  return (
    <div className="p-8 space-y-8">
      <h1>Training Platform Dashboard</h1>
      {/* ... rest of UI */}
    </div>
  );
}
```

**After (Next.js 14 - Client Component if interactive):**
```typescript
// /app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useJobStats } from '@/hooks/use-job-stats';

export default function DashboardPage() {
  const { stats, isLoading } = useJobStats();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1>Training Platform Dashboard</h1>
      {/* ... rest of UI */}
    </div>
  );
}
```

### 6.4 Routing Conversion

**React Router DOM → Next.js App Router**

| React Router Pattern | Next.js App Router |
|---------------------|-------------------|
| `<Route path="/" element={<Home />} />` | `/app/page.tsx` |
| `<Route path="/training/jobs" element={<Jobs />} />` | `/app/training/jobs/page.tsx` |
| `<Route path="/training/job/:id" element={<JobDetail />} />` | `/app/training/job/[id]/page.tsx` |
| `<Navigate to="/training/jobs" />` | `redirect('/training/jobs')` (server) or `router.push()` (client) |
| `<Link to="/training/jobs">Jobs</Link>` | `<Link href="/training/jobs">Jobs</Link>` |
| `useParams()` | `params` prop in Server Components or `useParams()` in Client |
| `useSearchParams()` | `searchParams` prop in Server Components or `useSearchParams()` in Client |
| `useNavigate()` | `useRouter()` from `next/navigation` |

**Example: Dynamic Route with Params**

**Before (React Router):**
```typescript
// /app/training-jobs/[id]/page.tsx (Vite)
import { useParams } from 'react-router-dom';

export default function JobDashboardPage() {
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState(getJobById(jobId));
  
  // ...
}
```

**After (Next.js - Client Component):**
```typescript
// /app/training/job/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useJob } from '@/hooks/use-job';

export default function JobDashboardPage() {
  const params = useParams();
  const jobId = params.id as string;
  
  const { job, isLoading } = useJob(jobId);
  
  // ...
}
```

**After (Next.js - Server Component):**
```typescript
// /app/training/job/[id]/page.tsx
import { getJobById } from '@/lib/actions/jobs';
import { JobDashboard } from '@/components/training/job-dashboard';

export default async function JobDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const job = await getJobById(params.id);
  
  if (!job) {
    return <div>Job not found</div>;
  }
  
  return <JobDashboard job={job} />;
}
```

### 6.5 Data Fetching Patterns

**Pattern 1: Server Component with Server Action**

```typescript
// /lib/actions/jobs.ts (Server Action)
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getJobById(jobId: string) {
  const supabase = createServerClient(cookies());
  
  const { data, error } = await supabase
    .from('training_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getJobStats() {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const [activeJobs, completedToday, queuedJobs] = await Promise.all([
    supabase.from('training_jobs').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'training'),
    supabase.from('training_jobs').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'completed').gte('completed_at', new Date().toISOString().split('T')[0]),
    supabase.from('training_jobs').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'queued'),
  ]);
  
  return {
    activeJobs: activeJobs.count || 0,
    completedToday: completedToday.count || 0,
    queuedJobs: queuedJobs.count || 0,
  };
}
```

```typescript
// /app/page.tsx (Server Component)
import { getJobStats } from '@/lib/actions/jobs';

export default async function DashboardPage() {
  const stats = await getJobStats();
  
  return (
    <div>
      <p>Active Jobs: {stats.activeJobs}</p>
      <p>Completed Today: {stats.completedToday}</p>
    </div>
  );
}
```

**Pattern 2: Client Component with SWR/React Query**

```typescript
// /hooks/use-job.ts
import useSWR from 'swr';
import { createBrowserClient } from '@/lib/supabase/client';

export function useJob(jobId: string) {
  const supabase = createBrowserClient();
  
  const { data, error, isLoading, mutate } = useSWR(
    ['job', jobId],
    async () => {
      const { data, error } = await supabase
        .from('training_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      return data;
    },
    { refreshInterval: 5000 } // Refresh every 5 seconds
  );
  
  return {
    job: data,
    isLoading,
    error,
    mutate,
  };
}
```

```typescript
// /app/training/job/[id]/page.tsx (Client Component)
'use client';

import { useParams } from 'next/navigation';
import { useJob } from '@/hooks/use-job';

export default function JobDashboardPage() {
  const params = useParams();
  const { job, isLoading, error } = useJob(params.id as string);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading job</div>;
  
  return <div>{job.name}</div>;
}
```

**Pattern 3: Mutations with Server Actions**

```typescript
// /lib/actions/jobs.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function cancelJob(jobId: string, reason: string) {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  const { data, error } = await supabase
    .from('training_jobs')
    .update({
      status: 'cancelled',
      cancelled_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Revalidate the jobs list
  revalidatePath('/training/jobs');
  revalidatePath(`/training/job/${jobId}`);
  
  return data;
}
```

```typescript
// /components/training/cancel-job-modal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelJob } from '@/lib/actions/jobs';
import { toast } from 'sonner';

export function CancelJobModal({ jobId, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await cancelJob(jobId, reason);
      toast.success('Job cancelled successfully');
      router.refresh(); // Refresh Server Components
      onClose();
    } catch (error) {
      toast.error('Failed to cancel job');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog>
      {/* ... modal UI */}
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Cancelling...' : 'Cancel Job'}
      </Button>
    </Dialog>
  );
}
```

### 6.6 Component Migration Checklist

For each component being migrated:

- [ ] Determine if it should be Server or Client Component
- [ ] Update imports:
  - `react-router-dom` → `next/link` and `next/navigation`
  - Absolute imports to use `@/` alias
- [ ] Replace `useNavigate()` with `useRouter()` from `next/navigation`
- [ ] Replace `<Link to="...">` with `<Link href="...">`
- [ ] Replace `useParams()` with `params` prop (Server) or `useParams()` from `next/navigation` (Client)
- [ ] Replace `useSearchParams()` from react-router with `searchParams` prop (Server) or `useSearchParams()` from `next/navigation` (Client)
- [ ] Replace mock data imports with API calls or Server Actions
- [ ] Add loading and error states
- [ ] Add `'use client'` directive if component uses:
  - `useState`, `useEffect`, `useContext`
  - Event handlers (`onClick`, etc.)
  - Browser APIs
  - Zustand stores
  - Real-time subscriptions

---

## 7. Feature Implementation Details

### 7.1 Stage 1: Job Configuration

**Pages to Migrate:**
- `/app/training/create/page.tsx` - Training file selection
- `/app/training/[jobId]/configure/page.tsx` - Hyperparameter configuration

**Backend Integration:**

1. **Training File Selection:**
   - Fetch training files via Server Action or API call
   - Implement real file upload functionality
   - Background enrichment processing

2. **Eligibility Validation:**
   - Server-side validation before job creation
   - Check: enrichment_status='completed', conversation_count >= 50
   - Real-time status updates via Supabase Realtime

3. **Job Creation:**
   - Call `createJob` Server Action
   - Store in database with status='draft'
   - Redirect to configure page

4. **Hyperparameter Configuration:**
   - Fetch presets from database
   - Calculate cost estimates based on conversation count
   - Save configuration via `configureJob` Server Action

**Implementation Example:**

```typescript
// /lib/actions/training-jobs.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createTrainingJob(trainingFileId: string, name: string) {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  // Validate training file
  const { data: file } = await supabase
    .from('training_files')
    .select('*')
    .eq('id', trainingFileId)
    .eq('user_id', user.id)
    .single();
  
  if (!file) throw new Error('Training file not found');
  if (file.enrichment_status !== 'completed') throw new Error('File not enriched');
  if (file.conversation_count < 50) throw new Error('Insufficient conversations');
  
  // Create job
  const { data: job, error } = await supabase
    .from('training_jobs')
    .insert({
      user_id: user.id,
      name,
      training_file_id: trainingFileId,
      status: 'draft',
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return job.id;
}

export async function configureJob(
  jobId: string,
  presetId: string,
  gpuType: 'spot' | 'ondemand',
  gpuModel: string
) {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  // Get preset
  const { data: preset } = await supabase
    .from('hyperparameter_presets')
    .select('*')
    .eq('id', presetId)
    .single();
  
  if (!preset) throw new Error('Preset not found');
  
  // Get job's training file for cost calculation
  const { data: job } = await supabase
    .from('training_jobs')
    .select('training_file_id, training_files(conversation_count)')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();
  
  if (!job) throw new Error('Job not found');
  
  const conversationCount = job.training_files.conversation_count;
  
  // Calculate estimates
  const durationMultiplier = conversationCount / 200; // Base is 200 conversations
  const durationMin = preset.estimates.duration_hours_min * durationMultiplier;
  const durationMax = preset.estimates.duration_hours_max * durationMultiplier;
  
  const costKey = gpuType === 'spot' ? 'cost_spot' : 'cost_ondemand';
  const costMin = preset.estimates[`${costKey}_min`] * durationMultiplier;
  const costMax = preset.estimates[`${costKey}_max`] * durationMultiplier;
  
  // Update job
  const { data: updatedJob, error } = await supabase
    .from('training_jobs')
    .update({
      preset_id: presetId,
      hyperparameters: preset.parameters,
      gpu_type: gpuType,
      gpu_model: gpuModel,
      estimated_cost_min: costMin,
      estimated_cost_max: costMax,
      total_epochs: preset.parameters.epochs,
      status: 'configured',
    })
    .eq('id', jobId)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (error) throw error;
  
  return updatedJob;
}
```

```typescript
// /app/training/create/page.tsx (Client Component)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTrainingJob } from '@/lib/actions/training-jobs';
import { toast } from 'sonner';

export default function CreateTrainingJobPage() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [jobName, setJobName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  
  const handleCreate = async () => {
    if (!selectedFileId || !jobName) return;
    
    setIsCreating(true);
    try {
      const jobId = await createTrainingJob(selectedFileId, jobName);
      toast.success('Training job created!');
      router.push(`/training/${jobId}/configure`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div>
      {/* Training file selection UI */}
      <button onClick={handleCreate} disabled={isCreating}>
        {isCreating ? 'Creating...' : 'Create Training Job'}
      </button>
    </div>
  );
}
```

### 7.2 Stage 2: Job Execution & Monitoring

**Pages to Migrate:**
- `/app/training/jobs/page.tsx` - Jobs list
- `/app/training/job/[id]/page.tsx` - Job dashboard

**Real-time Implementation:**

```typescript
// /hooks/use-job-realtime.ts
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import useSWR from 'swr';

export function useJobRealtime(jobId: string) {
  const supabase = createBrowserClient();
  
  const { data: job, mutate } = useSWR(['job', jobId], async () => {
    const { data } = await supabase
      .from('training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    return data;
  });
  
  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'training_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          mutate(payload.new, false);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, supabase, mutate]);
  
  return job;
}

export function useJobMetricsRealtime(jobId: string) {
  const supabase = createBrowserClient();
  
  const { data: metrics, mutate } = useSWR(['job-metrics', jobId], async () => {
    const { data } = await supabase
      .from('training_metrics')
      .select('*')
      .eq('job_id', jobId)
      .order('step', { ascending: true });
    return data;
  });
  
  // Subscribe to new metrics
  useEffect(() => {
    const channel = supabase
      .channel(`metrics-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'training_metrics',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          mutate((current) => [...(current || []), payload.new], false);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, supabase, mutate]);
  
  return metrics;
}
```

**Job Dashboard Implementation:**

```typescript
// /app/training/job/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useJobRealtime, useJobMetricsRealtime } from '@/hooks/use-job-realtime';
import { ProgressHeaderCard } from '@/components/training/progress-header-card';
import { LossCurveChart } from '@/components/training/loss-curve-chart';
import { MetricsPanel } from '@/components/training/metrics-panel';

export default function JobDashboardPage() {
  const params = useParams();
  const jobId = params.id as string;
  
  const job = useJobRealtime(jobId);
  const metrics = useJobMetricsRealtime(jobId);
  
  if (!job) return <div>Loading...</div>;
  
  return (
    <div className="p-8 space-y-6">
      <ProgressHeaderCard job={job} />
      
      {job.status === 'training' && (
        <>
          <LossCurveChart metrics={metrics} />
          <MetricsPanel job={job} currentMetrics={metrics?.[metrics.length - 1]} />
        </>
      )}
    </div>
  );
}
```

### 7.3 Stage 3: Error Handling & Recovery

**Implementation:**

1. **Error Detection:**
   - Monitor event_logs table for error events
   - Implement auto-retry logic in Edge Function
   - Show recovery options in UI

2. **Auto-Retry Logic:**

```typescript
// /supabase/functions/job-events/index.ts
import { createClient } from '@supabase/supabase-js';

async function handleJobError(jobId: string, errorType: string, errorMessage: string) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  // Get job details
  const { data: job } = await supabase
    .from('training_jobs')
    .select('*, retry_count, max_retries')
    .eq('id', jobId)
    .single();
  
  if (!job) return;
  
  // Auto-retry logic
  const retryableErrors = ['OOM', 'SPOT_INTERRUPTION', 'NETWORK_TIMEOUT'];
  const shouldRetry = retryableErrors.includes(errorType) && (job.retry_count || 0) < (job.max_retries || 3);
  
  if (shouldRetry) {
    // Create event log
    await supabase.from('event_logs').insert({
      job_id: jobId,
      event_type: 'info',
      severity: 'info',
      message: `Auto-retrying job (attempt ${(job.retry_count || 0) + 1}/${job.max_retries || 3})`,
      source: 'error_recovery',
    });
    
    // Update job status
    await supabase
      .from('training_jobs')
      .update({
        status: 'queued',
        retry_count: (job.retry_count || 0) + 1,
      })
      .eq('id', jobId);
    
    // TODO: Call external training infrastructure to restart job
  } else {
    // Mark as failed
    await supabase
      .from('training_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        failed_stage: job.current_stage,
      })
      .eq('id', jobId);
  }
}
```

### 7.4 Stage 4: Model Artifacts

**Implementation:**

1. **File Upload (from training infrastructure):**

```typescript
// /lib/actions/artifacts.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function createArtifact(
  jobId: string,
  file: File,
  artifactType: string,
  metadata: {
    version?: string;
    epoch?: number;
    step?: number;
    metrics?: object;
  }
) {
  const supabase = createServerClient(cookies());
  
  // Upload file to Supabase Storage
  const fileName = `${jobId}/${artifactType}-${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('model-artifacts')
    .upload(fileName, file);
  
  if (uploadError) throw uploadError;
  
  // Calculate checksum
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Create database record
  const { data, error } = await supabase
    .from('model_artifacts')
    .insert({
      job_id: jobId,
      artifact_type: artifactType,
      name: file.name,
      file_path: uploadData.path,
      file_size: file.size,
      mime_type: file.type,
      checksum,
      version: metadata.version,
      epoch: metadata.epoch,
      step: metadata.step,
      metrics: metadata.metrics,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}

export async function getArtifactDownloadUrl(artifactId: string) {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  // Get artifact
  const { data: artifact } = await supabase
    .from('model_artifacts')
    .select('file_path, job_id, training_jobs(user_id)')
    .eq('id', artifactId)
    .single();
  
  if (!artifact || artifact.training_jobs.user_id !== user.id) {
    throw new Error('Artifact not found');
  }
  
  // Generate signed URL (valid for 1 hour)
  const { data } = await supabase.storage
    .from('model-artifacts')
    .createSignedUrl(artifact.file_path, 3600);
  
  // Update download tracking
  await supabase
    .from('model_artifacts')
    .update({
      download_count: supabase.raw('download_count + 1'),
      last_downloaded_at: new Date().toISOString(),
    })
    .eq('id', artifactId);
  
  return data.signedUrl;
}
```

2. **Download Implementation:**

```typescript
// /components/training/model-artifacts-section.tsx
'use client';

import { useState } from 'react';
import { getArtifactDownloadUrl } from '@/lib/actions/artifacts';
import { toast } from 'sonner';

export function ModelArtifactsSection({ artifacts }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);
  
  const handleDownload = async (artifactId: string) => {
    setDownloading(artifactId);
    try {
      const url = await getArtifactDownloadUrl(artifactId);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.click();
      
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download artifact');
    } finally {
      setDownloading(null);
    }
  };
  
  return (
    <div>
      {artifacts.map((artifact) => (
        <div key={artifact.id}>
          <button
            onClick={() => handleDownload(artifact.id)}
            disabled={downloading === artifact.id}
          >
            {downloading === artifact.id ? 'Downloading...' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 7.5 Stage 5: Training Comparison

**Implementation:**

```typescript
// /app/training/compare/page.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useJobs } from '@/hooks/use-jobs';
import { ComparisonChart } from '@/components/training/comparison-chart';

export default function ComparisonPage() {
  const searchParams = useSearchParams();
  const jobIds = searchParams.getAll('jobId'); // e.g., ?jobId=1&jobId=2
  
  const { jobs } = useJobs({ ids: jobIds });
  
  if (!jobs || jobs.length < 2) {
    return <div>Select at least 2 jobs to compare</div>;
  }
  
  return (
    <div className="p-8 space-y-6">
      <h1>Compare Training Jobs</h1>
      
      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div key={job.id}>
            <h3>{job.name}</h3>
            <div>Status: {job.status}</div>
            <div>Cost: ${job.final_cost || job.current_cost}</div>
            {/* ... more metrics */}
          </div>
        ))}
      </div>
      
      {/* Comparison charts */}
      <ComparisonChart jobs={jobs} />
    </div>
  );
}
```

### 7.6 Stage 6: Quality Validation

**Implementation:**

1. **Trigger Validation:**

```typescript
// /lib/actions/validation.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function runValidation(jobId: string, testSuites: string[]) {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  // Verify job is completed
  const { data: job } = await supabase
    .from('training_jobs')
    .select('status, user_id')
    .eq('id', jobId)
    .single();
  
  if (!job || job.user_id !== user.id) throw new Error('Job not found');
  if (job.status !== 'completed') throw new Error('Job not completed');
  
  // Create validation record
  const { data: validation } = await supabase
    .from('validation_results')
    .insert({
      job_id: jobId,
      overall_status: 'review_required', // Will be updated by validation process
      overall_score: 0,
    })
    .select()
    .single();
  
  // TODO: Call external validation service
  // This would trigger async validation tests
  
  return validation.id;
}

export async function getValidationResults(jobId: string) {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  const { data } = await supabase
    .from('validation_results')
    .select(`
      *,
      training_jobs!inner(user_id)
    `)
    .eq('job_id', jobId)
    .eq('training_jobs.user_id', user.id)
    .single();
  
  return data;
}
```

2. **Validation Dashboard:**

```typescript
// /app/validation/dashboard/page.tsx
import { getValidationResults } from '@/lib/actions/validation';
import { CombinedQualityScorecard } from '@/components/validation/CombinedQualityScorecard';

export default async function ValidationDashboardPage({
  searchParams,
}: {
  searchParams: { jobId: string };
}) {
  const validation = await getValidationResults(searchParams.jobId);
  
  return (
    <div className="p-8 space-y-6">
      <h1>Validation Results</h1>
      <CombinedQualityScorecard validation={validation} />
      {/* ... other sections */}
    </div>
  );
}
```

### 7.7 Stage 7: Cost Management

**Implementation:**

1. **Cost Tracking:**

```typescript
// /lib/actions/cost.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getCostSummary(period: 'day' | 'week' | 'month' | 'quarter') {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  // Calculate date range
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
  }
  
  const { data: jobs } = await supabase
    .from('training_jobs')
    .select(`
      id,
      name,
      final_cost,
      current_cost,
      status,
      created_at,
      cost_tracking(*)
    `)
    .eq('user_id', user.id)
    .gte('created_at', startDate.toISOString());
  
  // Calculate totals
  const totalCost = jobs?.reduce((sum, job) => sum + (job.final_cost || job.current_cost || 0), 0) || 0;
  const totalSpotSavings = jobs?.reduce((sum, job) => {
    const tracking = job.cost_tracking?.[0];
    return sum + (tracking?.spot_savings || 0);
  }, 0) || 0;
  
  return {
    totalCost,
    totalSpotSavings,
    jobCount: jobs?.length || 0,
    breakdownByJob: jobs?.map(j => ({
      job_id: j.id,
      job_name: j.name,
      total_cost: j.final_cost || j.current_cost || 0,
    })) || [],
  };
}

export async function getBudgets() {
  const supabase = createServerClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  const { data } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  return data;
}
```

2. **Budget Dashboard:**

```typescript
// /app/cost/budget/page.tsx
import { getCostSummary, getBudgets } from '@/lib/actions/cost';
import { BudgetSummaryCards } from '@/components/cost/BudgetSummaryCards';
import { SpendingTrendGraph } from '@/components/cost/SpendingTrendGraph';

export default async function BudgetDashboardPage() {
  const [costSummary, budgets] = await Promise.all([
    getCostSummary('month'),
    getBudgets(),
  ]);
  
  return (
    <div className="p-8 space-y-6">
      <h1>Cost Management</h1>
      <BudgetSummaryCards summary={costSummary} budgets={budgets} />
      <SpendingTrendGraph />
    </div>
  );
}
```

---

## 8. Real-time Subscriptions

### 8.1 Supabase Realtime Setup

**Enable Realtime for Tables:**

```sql
-- Enable realtime for training_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE training_jobs;

-- Enable realtime for training_metrics
ALTER PUBLICATION supabase_realtime ADD TABLE training_metrics;

-- Enable realtime for event_logs
ALTER PUBLICATION supabase_realtime ADD TABLE event_logs;
```

### 8.2 Client-Side Subscription Patterns

**Job Status Updates:**

```typescript
// /hooks/use-job-subscription.ts
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useJobSubscription(jobId: string, onUpdate: (job: any) => void) {
  useEffect(() => {
    const supabase = createBrowserClient();
    
    const channel: RealtimeChannel = supabase
      .channel(`job-updates-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'training_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Job updated:', payload.new);
          onUpdate(payload.new);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, onUpdate]);
}
```

**Usage:**

```typescript
// /app/training/job/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useJobSubscription } from '@/hooks/use-job-subscription';

export default function JobDashboardPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState(null);
  
  // Subscribe to real-time updates
  useJobSubscription(params.id, (updatedJob) => {
    setJob(updatedJob);
  });
  
  return <div>{job?.name}</div>;
}
```

**Metrics Streaming:**

```typescript
// /hooks/use-metrics-subscription.ts
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export function useMetricsSubscription(jobId: string) {
  const [metrics, setMetrics] = useState<any[]>([]);
  
  useEffect(() => {
    const supabase = createBrowserClient();
    
    // Initial fetch
    const fetchMetrics = async () => {
      const { data } = await supabase
        .from('training_metrics')
        .select('*')
        .eq('job_id', jobId)
        .order('step', { ascending: true });
      
      setMetrics(data || []);
    };
    
    fetchMetrics();
    
    // Subscribe to new metrics
    const channel = supabase
      .channel(`metrics-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'training_metrics',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setMetrics((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);
  
  return metrics;
}
```

---

## 9. Authentication & Authorization

### 9.1 Supabase Auth Setup

**Enable Auth Providers:**

In Supabase Dashboard:
1. Email/Password (enabled by default)
2. OAuth providers (optional): Google, GitHub, etc.

**Email Templates:**

Configure email templates for:
- Confirmation email
- Password reset
- Magic link

### 9.2 Auth Middleware

**File:** `/middleware.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Redirect to dashboard if logged in and trying to access auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 9.3 Login/Signup Pages

**File:** `/app/auth/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      toast.success('Logged in successfully');
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6">Login to AI Training Platform</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### 9.4 Row-Level Security (RLS) Policies

All tables already have RLS policies defined in Section 4.2. Ensure they are properly implemented during migration.

**Key Policies:**
- Users can only view/modify their own data
- Cascading reads through foreign keys
- Service role bypasses RLS for Edge Functions

---

## 10. Testing & Validation

### 10.1 Testing Strategy

**Unit Tests:**
- Server Actions
- Utility functions
- Component logic

**Integration Tests:**
- API endpoints (Edge Functions)
- Database queries
- Auth flows

**E2E Tests:**
- Critical user flows (job creation, monitoring)
- Form submissions
- File uploads/downloads

### 10.2 Example Test: Server Action

```typescript
// __tests__/lib/actions/training-jobs.test.ts
import { createTrainingJob } from '@/lib/actions/training-jobs';
import { createServerClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

describe('createTrainingJob', () => {
  it('should create a job for valid training file', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'file-123',
                enrichment_status: 'completed',
                conversation_count: 100,
              },
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { id: 'job-123' },
            }),
          })),
        })),
      })),
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

    const jobId = await createTrainingJob('file-123', 'Test Job');

    expect(jobId).toBe('job-123');
  });

  it('should throw error for insufficient conversations', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'file-123',
                enrichment_status: 'completed',
                conversation_count: 30, // Below minimum
              },
            }),
          })),
        })),
      })),
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

    await expect(createTrainingJob('file-123', 'Test Job')).rejects.toThrow(
      'Insufficient conversations'
    );
  });
});
```

### 10.3 Validation Checklist

Before deployment, validate:

- [ ] All pages render correctly
- [ ] Auth flow works (login, logout, signup)
- [ ] RLS policies prevent unauthorized access
- [ ] Real-time subscriptions update UI
- [ ] File uploads work
- [ ] File downloads work
- [ ] Cost calculations are accurate
- [ ] Job creation workflow completes
- [ ] Job monitoring shows live updates
- [ ] Error handling displays appropriate messages
- [ ] Forms validate inputs
- [ ] API rate limiting works
- [ ] Database queries are optimized (check EXPLAIN plans)
- [ ] No console errors in browser
- [ ] Mobile responsiveness maintained

---

## 11. Deployment Considerations

### 11.1 Environment Variables

Create `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External Services (if applicable)
TRAINING_INFRASTRUCTURE_API_URL=https://api.example.com
TRAINING_INFRASTRUCTURE_API_KEY=your-api-key

# App Config
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 11.2 Deployment Platforms

**Recommended: Vercel**

1. Connect GitHub repository
2. Set environment variables
3. Deploy

**Database Hosting:**
- Supabase (managed PostgreSQL)

**Edge Functions:**
- Deployed via Supabase CLI

### 11.3 Performance Optimization

**Server Components:**
- Use Server Components by default
- Client Components only when needed

**Image Optimization:**
- Use Next.js `<Image>` component
- Optimize uploaded images

**Database:**
- Add indexes on frequently queried columns
- Use connection pooling
- Implement caching (Redis) for expensive queries

**CDN:**
- Serve static assets via CDN
- Use Supabase Storage CDN for files

### 11.4 Monitoring & Logging

**Error Tracking:**
- Integrate Sentry for error monitoring

**Analytics:**
- Add analytics (PostHog, Mixpanel)

**Logging:**
- Use Supabase logging for Edge Functions
- Structured logging in Server Actions

---

## Appendix A: Migration Commands

### Initialize Next.js Project

```bash
npx create-next-app@latest ai-training-platform --typescript --tailwind --app --src-dir=false
cd ai-training-platform
```

### Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install zustand
npm install swr # or @tanstack/react-query
npm install sonner
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu # ... other Shadcn dependencies
```

### Initialize Supabase

```bash
npx supabase init
npx supabase start
npx supabase db reset # Applies migrations
```

### Deploy Edge Functions

```bash
npx supabase functions deploy training-files
npx supabase functions deploy training-jobs
# ... deploy other functions
```

---

## Appendix B: Key Differences from Original Requirements

Based on the original `iteration-5-LoRA-training-initial.md` (which you attempted to fetch from GitHub but was too large), the key differences in this iteration are:

1. **Framework Change:** Vite → Next.js 14 App Router
2. **Backend Implementation:** Mock data → Real Supabase database and Edge Functions
3. **Real-time Features:** Simulated updates → Actual Supabase Realtime subscriptions
4. **Authentication:** None → Supabase Auth with RLS
5. **File Storage:** Mock paths → Supabase Storage buckets
6. **Navigation:** React Router → Next.js App Router (file-based)
7. **Component Strategy:** All Client Components → Hybrid Server/Client Components
8. **State Management:** Zustand (client-only) → Zustand + Server State (SWR/React Query)
9. **API Layer:** Edge Functions (mock) → Edge Functions (real) + Server Actions

---

## Appendix C: Priority Implementation Order

If implementing in phases, follow this order:

**Phase 1 (Critical Path - Week 1-2):**
1. Set up Next.js project
2. Configure Supabase (database, auth, storage)
3. Implement database schema and migrations
4. Set up authentication
5. Migrate core pages (dashboard, job creation)

**Phase 2 (Core Functionality - Week 2-3):**
6. Implement job management APIs
7. Build job monitoring with real-time updates
8. File upload/download functionality
9. Metrics collection and display

**Phase 3 (Advanced Features - Week 3-4):**
10. Error handling and recovery
11. Model artifacts management
12. Training comparison
13. Quality validation

**Phase 4 (Polish - Week 4-5):**
14. Cost management and budgets
15. Templates system
16. Performance optimization
17. Testing and bug fixes

---

## Summary

This specification provides a complete roadmap for converting the existing Vite-based wireframe application to a fully functional Next.js 14 application with Supabase backend. The source application has a comprehensive frontend with all UI components, navigation, and mock data in place. Your task is to:

1. **Recreate the file structure** following Next.js App Router conventions
2. **Implement the database schema** with all necessary tables, indexes, RLS policies, and triggers
3. **Build Edge Functions** for all API endpoints (training files, jobs, metrics, events, artifacts, validation, cost tracking, templates)
4. **Migrate all pages** from Vite to Next.js, converting routing and imports
5. **Connect frontend to backend** using Server Actions and API calls
6. **Implement real-time features** using Supabase Realtime subscriptions
7. **Add authentication** with Supabase Auth and protect routes with middleware
8. **Implement file storage** for training files and model artifacts
9. **Test thoroughly** to ensure all functionality works end-to-end
10. **Deploy** to production (Vercel + Supabase)

The existing wireframe provides the complete UI/UX foundation. Your focus should be on backend integration, data persistence, real-time updates, and ensuring all features are fully operational with real data flows.

Good luck with the implementation!
