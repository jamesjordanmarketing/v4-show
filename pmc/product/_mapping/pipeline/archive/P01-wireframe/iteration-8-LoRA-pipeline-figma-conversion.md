# BrightRun LoRA Training Platform - Full Stack Implementation Specification

**Version:** 8.0  
**Date:** December 20, 2024  
**Framework:** Next.js 14 (App Router)  
**Status:** Complete Wireframe → Production Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Architecture Overview](#architecture-overview)
4. [Frontend Migration: Vite → Next.js 14](#frontend-migration-vite--nextjs-14)
5. [Backend API Specification](#backend-api-specification)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [Real-Time Features](#real-time-features)
9. [File Storage & Management](#file-storage--management)
10. [Training Job Orchestration](#training-job-orchestration)
11. [Cost Tracking & Billing](#cost-tracking--billing)
12. [Testing Strategy](#testing-strategy)
13. [Deployment & DevOps](#deployment--devops)
14. [Migration Checklist](#migration-checklist)

---

## Executive Summary

This specification details the complete conversion of the BrightRun LoRA Training Platform from a Vite-based wireframe to a production-ready Next.js 14 application with full backend integration. The wireframe contains 5 complete pages (P01-P05) representing the entire training pipeline from dataset management through model artifact delivery.

### Key Requirements
- **Framework:** Next.js 14 with App Router (TypeScript)
- **Frontend:** Existing Vite wireframe components (React + Tailwind + shadcn/ui)
- **Backend:** Next.js API Routes + External Training Service Integration
- **Database:** PostgreSQL (via Supabase or similar)
- **Real-time:** WebSockets/Server-Sent Events for training progress
- **Storage:** S3-compatible object storage for datasets and models
- **Authentication:** NextAuth.js or Supabase Auth

### Wireframe Pages to Migrate
1. **P01 - Dashboard** (`/src/app/components/pages/DashboardPage.tsx`)
2. **P02 - Datasets Manager** (`/src/app/pages/DatasetsPage.tsx`)
3. **P03 - Training Configurator** (`/src/app/pages/TrainingConfiguratorPage.tsx`)
4. **P04 - Training Monitor** (`/src/app/pages/TrainingMonitorPage.tsx`)
5. **P05 - Model Artifacts** (`/src/app/pages/ModelArtifactsPage.tsx`)

---

## Project Overview

### Business Context
BrightRun enables AI engineers to transform conversation datasets into trained LoRA (Low-Rank Adaptation) models for fine-tuning large language models. The platform handles:
- Dataset upload, validation, and formatting
- Training job configuration with preset and custom hyperparameters
- GPU resource allocation and cost estimation
- Real-time training progress monitoring
- Model artifact storage and deployment

### User Journey
```
1. Upload/Import Dataset (P02)
   ↓
2. Validate & Preview Dataset (P02)
   ↓
3. Configure Training Job (P03)
   - Select hyperparameter preset (Conservative/Balanced/Aggressive)
   - Customize advanced settings
   - Review cost estimation
   ↓
4. Launch Training Job (P03 → P04)
   ↓
5. Monitor Training Progress (P04)
   - Real-time metrics updates
   - Loss curves and validation
   - Cost tracking
   ↓
6. Training Completion (P04)
   ↓
7. View/Download Model Artifacts (P05)
   - Quality metrics
   - Download LoRA adapters
   - Deploy to production
```

### Technical Stack

#### Frontend (Existing Wireframe)
- **Framework:** Vite + React 18 + TypeScript
- **UI Library:** Tailwind CSS v4.0 + shadcn/ui components
- **Charts:** Recharts
- **Icons:** Lucide React
- **State Management:** React hooks (useState, useEffect, useMemo)
- **Notifications:** Sonner (toast)
- **Effects:** canvas-confetti

#### Backend (To Be Implemented)
- **Framework:** Next.js 14 API Routes
- **Database:** PostgreSQL (recommended: Supabase)
- **ORM:** Prisma or Drizzle ORM
- **File Storage:** S3-compatible (AWS S3, R2, Supabase Storage)
- **Authentication:** NextAuth.js v5 or Supabase Auth
- **Real-time:** Server-Sent Events (SSE) or WebSockets
- **Job Queue:** BullMQ + Redis (for training job orchestration)
- **Training Service:** External GPU cluster API integration

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 14 Application                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────┐        ┌─────────────────────┐      │
│  │   Client (Browser) │◄──────►│  API Routes         │      │
│  │   - React Pages    │        │  /api/*             │      │
│  │   - Components     │        │  - REST endpoints   │      │
│  │   - Real-time UI   │        │  - SSE streams      │      │
│  └────────────────────┘        └─────────────────────┘      │
│           │                              │                    │
└───────────┼──────────────────────────────┼───────────────────┘
            │                              │
            │                              ▼
            │                    ┌──────────────────┐
            │                    │   PostgreSQL     │
            │                    │   - Users        │
            │                    │   - Datasets     │
            │                    │   - Jobs         │
            │                    │   - Models       │
            │                    │   - Costs        │
            │                    └──────────────────┘
            │                              │
            │                              │
            ▼                              ▼
   ┌─────────────────┐          ┌──────────────────┐
   │  S3 Storage     │          │   Redis          │
   │  - Datasets     │          │   - Job Queue    │
   │  - Models       │          │   - Sessions     │
   │  - Artifacts    │          │   - Cache        │
   └─────────────────┘          └──────────────────┘
            │
            │
            ▼
   ┌─────────────────────────────────────┐
   │   External Training Cluster         │
   │   - GPU Resource Management         │
   │   - LoRA Training Workers           │
   │   - Progress Reporting API          │
   │   - Artifact Upload                 │
   └─────────────────────────────────────┘
```

### Data Flow

#### 1. Dataset Upload Flow
```
User uploads file → Next.js API route → Validate format → 
Store in S3 → Create DB record → Parse metadata → 
Return dataset_id
```

#### 2. Training Job Launch Flow
```
User configures job (P03) → Submit to /api/jobs/create → 
Validate config → Estimate cost → Create job record → 
Push to Redis queue → Worker picks job → 
Send to training cluster → Return job_id → 
Navigate to P04 monitor
```

#### 3. Real-time Progress Flow
```
P04 connects to /api/jobs/[id]/stream (SSE) → 
Training cluster sends updates → Worker processes → 
Push to SSE stream → Browser receives → Update UI → 
Store metrics in DB
```

#### 4. Model Artifact Delivery Flow
```
Training completes → Upload artifacts to S3 → 
Update job status → Create model record → 
Notify user → User views P05 → Download from S3 → 
Deploy to inference service
```

---

## Frontend Migration: Vite → Next.js 14

### Current Vite Structure
```
/src
  /app
    App.tsx                    # Main router component
    /components
      /layout                  # DashboardLayout, Sidebar, Header
      /pages                   # DashboardPage, TrainingJobsPage, ModelsPage
      /datasets                # DatasetCard, DatasetDetailModal
      /training                # PresetSelector, AdvancedSettings
      /training-monitor        # ProgressCards, LossCurve, MetricsTable
      /model-artifacts         # ArtifactCards, DownloadPanel
      /ui                      # shadcn/ui components
    /pages
      DatasetsPage.tsx         # P02
      TrainingConfiguratorPage.tsx  # P03
      TrainingMonitorPage.tsx  # P04
      ModelArtifactsPage.tsx   # P05
    /data
      mockData.ts              # Mock data for all features
      datasetMockData.ts
      trainingConfigMockData.ts
      trainingMonitorMockData.ts
      modelArtifactsMockData.ts
    /utils
      formatters.ts
  /styles
    theme.css
    fonts.css
```

### Target Next.js 14 Structure (App Router)

```
/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Dashboard (P01) - Home page
│   ├── globals.css                   # Global styles (migrate from theme.css)
│   │
│   ├── (auth)/                       # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/                  # Main app route group (requires auth)
│   │   ├── layout.tsx                # DashboardLayout wrapper
│   │   │
│   │   ├── datasets/
│   │   │   ├── page.tsx              # P02 - Datasets list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Dataset detail view
│   │   │
│   │   ├── training/
│   │   │   ├── configure/
│   │   │   │   └── page.tsx          # P03 - Training Configurator
│   │   │   │                         # URL: /training/configure?dataset_id=xxx
│   │   │   │
│   │   │   └── jobs/
│   │   │       ├── page.tsx          # Training Jobs list
│   │   │       └── [jobId]/
│   │   │           └── page.tsx      # P04 - Training Monitor
│   │   │
│   │   ├── models/
│   │   │   ├── page.tsx              # Models list
│   │   │   └── [artifactId]/
│   │   │       └── page.tsx          # P05 - Model Artifacts
│   │   │
│   │   └── settings/
│   │       └── page.tsx              # Settings page
│   │
│   └── api/                          # API Routes
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts          # NextAuth configuration
│       │
│       ├── datasets/
│       │   ├── route.ts              # GET /api/datasets, POST /api/datasets
│       │   ├── [id]/
│       │   │   ├── route.ts          # GET, PATCH, DELETE /api/datasets/[id]
│       │   │   └── upload/
│       │   │       └── route.ts      # POST /api/datasets/[id]/upload
│       │   └── validate/
│       │       └── route.ts          # POST /api/datasets/validate
│       │
│       ├── jobs/
│       │   ├── route.ts              # GET /api/jobs, POST /api/jobs
│       │   ├── [id]/
│       │   │   ├── route.ts          # GET, PATCH /api/jobs/[id]
│       │   │   ├── stream/
│       │   │   │   └── route.ts      # GET /api/jobs/[id]/stream (SSE)
│       │   │   ├── cancel/
│       │   │   │   └── route.ts      # POST /api/jobs/[id]/cancel
│       │   │   └── metrics/
│       │   │       └── route.ts      # GET /api/jobs/[id]/metrics
│       │   └── estimate/
│       │       └── route.ts          # POST /api/jobs/estimate
│       │
│       ├── models/
│       │   ├── route.ts              # GET /api/models
│       │   ├── [id]/
│       │   │   ├── route.ts          # GET /api/models/[id]
│       │   │   ├── download/
│       │   │   │   └── route.ts      # GET /api/models/[id]/download
│       │   │   └── deploy/
│       │   │       └── route.ts      # POST /api/models/[id]/deploy
│       │   └── artifacts/
│       │       └── route.ts          # GET /api/models/artifacts
│       │
│       ├── costs/
│       │   ├── route.ts              # GET /api/costs
│       │   └── summary/
│       │       └── route.ts          # GET /api/costs/summary
│       │
│       └── notifications/
│           └── route.ts              # GET /api/notifications
│
├── components/                       # Migrate from /src/app/components
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── AppHeader.tsx
│   │   └── Providers.tsx            # Context providers wrapper
│   │
│   ├── datasets/
│   │   ├── DatasetCard.tsx
│   │   ├── DatasetDetailModal.tsx
│   │   ├── DatasetUploadForm.tsx
│   │   └── DatasetValidation.tsx
│   │
│   ├── training/
│   │   ├── PresetSelector.tsx
│   │   ├── AdvancedSettingsPanel.tsx
│   │   ├── CostEstimationPanel.tsx
│   │   └── LaunchConfirmationModal.tsx
│   │
│   ├── training-monitor/
│   │   ├── ProgressHeaderCard.tsx
│   │   ├── StageProgressIndicator.tsx
│   │   ├── LossCurveGraph.tsx
│   │   ├── CurrentMetricsTable.tsx
│   │   └── CostTrackerCard.tsx
│   │
│   ├── model-artifacts/
│   │   ├── QualityMetricsCard.tsx
│   │   ├── DownloadPanel.tsx
│   │   ├── DeploymentPanel.tsx
│   │   └── VersionHistory.tsx
│   │
│   └── ui/                          # shadcn/ui components (keep as-is)
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       └── ... (30+ components)
│
├── lib/                              # Utility libraries
│   ├── db.ts                        # Database client (Prisma/Drizzle)
│   ├── auth.ts                      # NextAuth configuration
│   ├── storage.ts                   # S3 client wrapper
│   ├── queue.ts                     # BullMQ queue setup
│   ├── training-client.ts           # External training API client
│   └── utils.ts                     # Shared utilities
│
├── types/                            # TypeScript type definitions
│   ├── dataset.ts
│   ├── job.ts
│   ├── model.ts
│   ├── user.ts
│   └── api.ts
│
├── hooks/                            # Custom React hooks
│   ├── useDatasets.ts               # SWR hook for datasets
│   ├── useTrainingJobs.ts           # SWR hook for jobs
│   ├── useModels.ts                 # SWR hook for models
│   ├── useJobStream.ts              # SSE hook for real-time updates
│   └── useCostTracking.ts           # Cost tracking hook
│
├── prisma/                           # Database schema (if using Prisma)
│   ├── schema.prisma
│   └── migrations/
│
├── public/                           # Static assets
│   ├── images/
│   └── icons/
│
├── .env.local                        # Environment variables
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
└── tsconfig.json                     # TypeScript configuration
```

### Migration Steps

#### Step 1: Project Setup
```bash
# Create new Next.js 14 project
npx create-next-app@latest brightrun-lora --typescript --tailwind --app --src-dir

# Install dependencies from current wireframe
npm install lucide-react recharts sonner canvas-confetti
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog # ... all shadcn deps

# Install new backend dependencies
npm install next-auth@beta  # v5 for App Router
npm install @prisma/client prisma
npm install bullmq ioredis
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install swr  # For data fetching
npm install zod  # For validation
```

#### Step 2: Copy Component Library
1. Copy `/src/app/components/ui/*` → `/components/ui/`
2. Copy all feature components:
   - `/src/app/components/layout/*` → `/components/layout/`
   - `/src/app/components/datasets/*` → `/components/datasets/`
   - `/src/app/components/training/*` → `/components/training/`
   - `/src/app/components/training-monitor/*` → `/components/training-monitor/`
   - `/src/app/components/model-artifacts/*` → `/components/model-artifacts/`

#### Step 3: Convert Pages to Next.js Routes

**Example: P02 Datasets Page**

Current Vite: `/src/app/pages/DatasetsPage.tsx`
```typescript
export function DatasetsPage({ onStartTraining }: DatasetsPageProps) {
  const [datasets, setDatasets] = useState(mockDatasets);
  // ... component logic
}
```

Next.js 14: `/app/(dashboard)/datasets/page.tsx`
```typescript
'use client';

import { useDatasets } from '@/hooks/useDatasets';
import { DatasetsPageClient } from './DatasetsPageClient';

export default function DatasetsPage() {
  return <DatasetsPageClient />;
}
```

`/app/(dashboard)/datasets/DatasetsPageClient.tsx`
```typescript
'use client';

import { useDatasets } from '@/hooks/useDatasets';
import { useRouter } from 'next/navigation';
import { DatasetCard } from '@/components/datasets/DatasetCard';

export function DatasetsPageClient() {
  const router = useRouter();
  const { data: datasets, isLoading, error } = useDatasets();
  
  const handleStartTraining = (datasetId: string) => {
    router.push(`/training/configure?dataset_id=${datasetId}`);
  };
  
  // Rest of component logic (same as wireframe)
  // Replace mockDatasets with datasets from API
}
```

#### Step 4: Replace Mock Data with API Calls

**Current:** Direct mock data imports
```typescript
import { mockDatasets } from '../data/datasetMockData';
const [datasets, setDatasets] = useState(mockDatasets);
```

**New:** SWR hooks for server data
```typescript
// /hooks/useDatasets.ts
import useSWR from 'swr';

export function useDatasets() {
  return useSWR('/api/datasets', fetcher);
}

// In component
const { data: datasets, isLoading, mutate } = useDatasets();
```

#### Step 5: Implement Navigation

**Current:** State-based routing in App.tsx
```typescript
const [currentView, setCurrentView] = useState({ type: 'main' });
const handleStartTraining = (datasetId) => {
  setCurrentView({ type: 'configurator', params: { datasetId } });
};
```

**New:** Next.js App Router
```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();
const handleStartTraining = (datasetId: string) => {
  router.push(`/training/configure?dataset_id=${datasetId}`);
};
```

#### Step 6: Convert Styles

1. Copy `/src/styles/theme.css` → `/app/globals.css`
2. Copy `/src/styles/fonts.css` → `/app/fonts.css` (import in layout.tsx)
3. Update Tailwind config to match v4.0 syntax from wireframe

---

## Backend API Specification

### API Architecture Principles
- **RESTful design** for CRUD operations
- **Server-Sent Events (SSE)** for real-time progress streaming
- **Presigned URLs** for large file uploads/downloads
- **Pagination** for list endpoints (cursor-based preferred)
- **Rate limiting** to prevent abuse
- **Validation** using Zod schemas
- **Error handling** with standardized error responses

### Authentication & Authorization

All API routes except `/api/auth/*` require authentication.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**User Roles:**
- `user` - Standard user (can manage own resources)
- `admin` - Admin (can view/manage all resources)
- `billing_admin` - Can view all cost data

### Standard Response Formats

**Success Response:**
```typescript
{
  success: true,
  data: T,
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
    }
  }
}
```

**Error Response:**
```typescript
{
  success: false,
  error: {
    code: string;           // e.g., "DATASET_NOT_FOUND"
    message: string;        // Human-readable error
    details?: any;          // Additional error context
    field?: string;         // For validation errors
  }
}
```

---

### API Endpoints

## 1. Authentication API

### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```typescript
{
  email: string;
  password: string;
  name: string;
  organization?: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: string;
    },
    token: string;
  }
}
```

### POST `/api/auth/login`
Authenticate user and return JWT token.

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    user: User;
    token: string;
    expiresAt: string;
  }
}
```

---

## 2. Datasets API

### GET `/api/datasets`
Retrieve all datasets for the authenticated user.

**Query Parameters:**
```typescript
{
  page?: number;          // Default: 1
  pageSize?: number;      // Default: 20, Max: 100
  sortBy?: 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc';
  format?: 'all' | 'brightrun-lora-v4' | 'brightrun-lora-v3';
  trainingReady?: 'all' | 'true' | 'false';
  search?: string;        // Search in name and description
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    datasets: Dataset[];
  },
  meta: {
    pagination: {
      page: 1,
      pageSize: 20,
      total: 45,
      hasMore: true
    }
  }
}

// Dataset type
interface Dataset {
  id: string;
  userId: string;
  name: string;
  description: string;
  format: 'brightrun-lora-v4' | 'brightrun-lora-v3';
  status: 'uploading' | 'validating' | 'ready' | 'error';
  trainingReady: boolean;
  
  // Dataset stats
  totalTrainingPairs: number;
  totalValidationPairs: number;
  totalTokens: number;
  avgTurnsPerConversation: number;
  avgTokensPerTurn: number;
  fileSize: number;              // bytes
  
  // S3 storage
  s3Key: string;
  s3Bucket: string;
  
  // Metadata
  uploadedAt: string;            // ISO timestamp
  processedAt?: string;
  validatedAt?: string;
  errorMessage?: string;
  
  // Sample data
  sampleConversations?: Conversation[];  // First 3 conversations
  
  createdAt: string;
  updatedAt: string;
}
```

### POST `/api/datasets`
Create a new dataset (initiates upload process).

**Request Body:**
```typescript
{
  name: string;
  description: string;
  format: 'brightrun-lora-v4' | 'brightrun-lora-v3';
  fileSize: number;           // bytes
  fileName: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    datasetId: string;
    uploadUrl: string;        // Presigned S3 URL (valid for 1 hour)
    uploadFields: {           // Fields to include in multipart upload
      key: string;
      policy: string;
      signature: string;
    }
  }
}
```

**Client Upload Flow:**
```javascript
// 1. Create dataset
const { datasetId, uploadUrl, uploadFields } = await createDataset({ ... });

// 2. Upload file to S3 using presigned URL
const formData = new FormData();
Object.entries(uploadFields).forEach(([key, value]) => {
  formData.append(key, value);
});
formData.append('file', file);

await fetch(uploadUrl, {
  method: 'POST',
  body: formData,
});

// 3. Confirm upload
await fetch(`/api/datasets/${datasetId}/confirm`, { method: 'POST' });
```

### GET `/api/datasets/[id]`
Retrieve a specific dataset by ID.

**Response:**
```typescript
{
  success: true,
  data: {
    dataset: Dataset & {
      fullStatistics: {
        vocabularySize: number;
        uniqueSpeakers: number;
        topicDistribution: { topic: string; count: number }[];
        lengthDistribution: {
          min: number;
          max: number;
          mean: number;
          median: number;
          p95: number;
        };
      }
    }
  }
}
```

### PATCH `/api/datasets/[id]`
Update dataset metadata.

**Request Body:**
```typescript
{
  name?: string;
  description?: string;
}
```

### DELETE `/api/datasets/[id]`
Delete a dataset (soft delete, removes from S3 after 30 days).

**Response:**
```typescript
{
  success: true,
  data: {
    message: "Dataset marked for deletion"
  }
}
```

### POST `/api/datasets/validate`
Validate dataset format before upload.

**Request Body:**
```typescript
{
  content: string;          // First 100KB of file
  format: 'brightrun-lora-v4' | 'brightrun-lora-v3';
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    statistics: {
      estimatedPairs: number;
      sampleConversation: Conversation;
    }
  }
}
```

---

## 3. Training Jobs API

### POST `/api/jobs`
Create and launch a new training job.

**Request Body:**
```typescript
{
  datasetId: string;
  presetId: 'conservative' | 'balanced' | 'aggressive' | 'custom';
  
  // Hyperparameters
  hyperparameters: {
    learningRate: number;
    batchSize: number;
    numEpochs: number;
    warmupSteps: number;
    loraRank: number;
    loraAlpha: number;
    loraDropout: number;
    targetModules: string[];
    optimizerType: 'adamw' | 'sgd' | 'adafactor';
    weightDecay: number;
    gradientAccumulationSteps: number;
    maxGradNorm: number;
    scheduler: 'linear' | 'cosine' | 'constant';
  };
  
  // GPU Configuration
  gpuConfig: {
    instanceType: 'a100-40gb' | 'a100-80gb' | 'h100-80gb';
    numGPUs: 1 | 2 | 4 | 8;
  };
  
  // Optional settings
  earlyStoppingPatience?: number;
  validationSplitRatio?: number;
  checkpointInterval?: number;  // Save checkpoint every N steps
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    jobId: string;
    status: 'queued' | 'initializing';
    estimatedCost: {
      gpuCost: number;
      storageCost: number;
      dataCost: number;
      total: number;
      currency: 'USD';
    };
    estimatedDuration: {
      min: number;        // seconds
      max: number;
    };
    queuePosition?: number;
    createdAt: string;
  }
}
```

### GET `/api/jobs`
List all training jobs for the user.

**Query Parameters:**
```typescript
{
  status?: 'all' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  page?: number;
  pageSize?: number;
  sortBy?: 'created-desc' | 'created-asc' | 'cost-desc';
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    jobs: TrainingJob[];
  },
  meta: { pagination: { ... } }
}

interface TrainingJob {
  id: string;
  userId: string;
  datasetId: string;
  datasetName: string;
  
  status: 'queued' | 'initializing' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Configuration
  presetId: string;
  hyperparameters: HyperparameterConfig;
  gpuConfig: GPUConfig;
  
  // Progress tracking
  currentStage: 'queued' | 'initializing' | 'training' | 'validating' | 'saving' | 'completed';
  progress: number;              // 0-100
  currentEpoch?: number;
  totalEpochs: number;
  currentStep?: number;
  totalSteps?: number;
  
  // Metrics
  currentMetrics?: {
    trainingLoss: number;
    validationLoss?: number;
    learningRate: number;
    throughput: number;          // tokens/sec
    gpuUtilization: number;      // percentage
  };
  
  // Time tracking
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  
  // Cost tracking
  currentCost: number;
  estimatedTotalCost: number;
  
  // Error handling
  errorMessage?: string;
  errorStack?: string;
  
  // Artifact info (when completed)
  artifactId?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

### GET `/api/jobs/[id]`
Get detailed information about a specific training job.

**Response:**
```typescript
{
  success: true,
  data: {
    job: TrainingJob & {
      // Full metrics history
      metricsHistory: {
        timestamp: string;
        epoch: number;
        step: number;
        trainingLoss: number;
        validationLoss?: number;
        learningRate: number;
        gradientNorm?: number;
      }[];
      
      // Loss curve data (for graphing)
      lossCurve: {
        steps: number[];
        trainingLoss: number[];
        validationLoss: number[];
      };
      
      // Checkpoints
      checkpoints: {
        id: string;
        step: number;
        epoch: number;
        loss: number;
        s3Key: string;
        createdAt: string;
      }[];
      
      // Logs
      logs: {
        timestamp: string;
        level: 'info' | 'warning' | 'error';
        message: string;
      }[];
    }
  }
}
```

### GET `/api/jobs/[id]/stream`
**Real-time progress updates via Server-Sent Events (SSE)**

This endpoint establishes a persistent connection that streams training updates.

**Response (SSE Stream):**
```
event: progress
data: {"progress": 23.5, "currentEpoch": 2, "currentStep": 450, "estimatedTimeRemaining": 3420}

event: metrics
data: {"trainingLoss": 0.234, "validationLoss": 0.267, "learningRate": 0.0001, "throughput": 1250}

event: stage
data: {"stage": "training", "message": "Epoch 2/5 in progress"}

event: cost
data: {"currentCost": 12.45, "estimatedTotal": 48.50}

event: checkpoint
data: {"checkpointId": "ckpt-001", "step": 500, "loss": 0.225}

event: complete
data: {"jobId": "job-123", "artifactId": "artifact-456", "finalCost": 47.82}

event: error
data: {"error": "GPU memory exceeded", "canRetry": true}
```

**Client Implementation:**
```typescript
const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

eventSource.addEventListener('progress', (e) => {
  const data = JSON.parse(e.data);
  updateProgress(data);
});

eventSource.addEventListener('metrics', (e) => {
  const data = JSON.parse(e.data);
  updateMetrics(data);
});

eventSource.addEventListener('complete', (e) => {
  const data = JSON.parse(e.data);
  handleCompletion(data);
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

### POST `/api/jobs/[id]/cancel`
Cancel a running or queued training job.

**Response:**
```typescript
{
  success: true,
  data: {
    jobId: string;
    status: 'cancelled';
    refundAmount?: number;      // Partial refund for unused compute
    message: string;
  }
}
```

### POST `/api/jobs/estimate`
Estimate cost and duration for a training configuration.

**Request Body:**
```typescript
{
  datasetId: string;
  hyperparameters: HyperparameterConfig;
  gpuConfig: GPUConfig;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    cost: {
      breakdown: {
        compute: { hours: number; rate: number; total: number };
        storage: { gb: number; rate: number; total: number };
        dataTransfer: { gb: number; rate: number; total: number };
      };
      total: number;
      currency: 'USD';
    };
    duration: {
      estimated: number;        // seconds
      min: number;
      max: number;
    };
    tokensPerSecond: number;
    totalSteps: number;
  }
}
```

---

## 4. Models (Artifacts) API

### GET `/api/models`
List all trained models for the user.

**Query Parameters:**
```typescript
{
  status?: 'all' | 'stored' | 'deployed' | 'archived';
  sortBy?: 'created-desc' | 'quality-desc' | 'size-desc';
  page?: number;
  pageSize?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    models: ModelArtifact[];
  },
  meta: { pagination: { ... } }
}

interface ModelArtifact {
  id: string;
  userId: string;
  jobId: string;
  datasetId: string;
  
  // Metadata
  name: string;
  version: string;
  description?: string;
  
  // Status
  status: 'stored' | 'deployed' | 'archived';
  deployedAt?: string;
  
  // Quality metrics
  qualityMetrics: {
    finalTrainingLoss: number;
    finalValidationLoss: number;
    perplexity: number;
    bleuScore?: number;
    convergenceQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
    
    // Detailed scores
    validationScores: {
      semanticSimilarity: number;
      coherence: number;
      fluency: number;
      taskAccuracy: number;
    };
  };
  
  // Training summary
  trainingSummary: {
    totalEpochs: number;
    totalSteps: number;
    trainingDuration: number;    // seconds
    totalCost: number;
    gpuHours: number;
  };
  
  // Configuration reference
  configuration: {
    baseModel: string;
    datasetName: string;
    presetUsed: string;
    hyperparameters: HyperparameterConfig;
  };
  
  // Artifacts
  artifacts: {
    adapterModel: {
      s3Key: string;
      fileName: 'adapter_model.safetensors';
      size: number;            // bytes
      checksum: string;
    };
    adapterConfig: {
      s3Key: string;
      fileName: 'adapter_config.json';
      size: number;
    };
    tokenizer?: {
      s3Key: string;
      fileName: 'tokenizer.json';
      size: number;
    };
    checkpoints?: {
      s3Key: string;
      epoch: number;
      size: number;
    }[];
  };
  
  // Version history
  parentModelId?: string;      // If this is a retrained version
  childModelIds?: string[];    // Newer versions
  
  createdAt: string;
  updatedAt: string;
}
```

### GET `/api/models/[id]`
Get detailed information about a specific model artifact.

**Response:**
```typescript
{
  success: true,
  data: {
    model: ModelArtifact & {
      // Full training metrics history
      metricsHistory: MetricsPoint[];
      
      // Dataset lineage
      datasetLineage: {
        originalDataset: Dataset;
        preprocessingSteps: string[];
        splits: {
          train: number;
          validation: number;
          test?: number;
        };
      };
      
      // Download URLs (presigned, valid for 1 hour)
      downloadUrls: {
        adapterModel: string;
        adapterConfig: string;
        tokenizer?: string;
        allArtifacts: string;    // ZIP of all files
      };
    }
  }
}
```

### GET `/api/models/[id]/download`
Generate presigned download URLs for model artifacts.

**Query Parameters:**
```typescript
{
  artifact?: 'all' | 'adapter-model' | 'adapter-config' | 'tokenizer';
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    downloadUrl: string;         // Presigned S3 URL (valid 1 hour)
    fileName: string;
    fileSize: number;
    expiresAt: string;
  }
}
```

### POST `/api/models/[id]/deploy`
Deploy a model to the inference service.

**Request Body:**
```typescript
{
  environment: 'staging' | 'production';
  endpointName?: string;
  instanceType?: string;
  minReplicas?: number;
  maxReplicas?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    deploymentId: string;
    endpointUrl: string;
    status: 'deploying';
    estimatedReadyAt: string;
  }
}
```

### PATCH `/api/models/[id]`
Update model metadata.

**Request Body:**
```typescript
{
  name?: string;
  description?: string;
  status?: 'stored' | 'archived';
}
```

### DELETE `/api/models/[id]`
Delete model artifacts (soft delete).

---

## 5. Costs API

### GET `/api/costs`
Retrieve cost data for the user.

**Query Parameters:**
```typescript
{
  startDate?: string;      // ISO date
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
  jobId?: string;          // Filter to specific job
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    costs: {
      date: string;
      compute: number;
      storage: number;
      dataTransfer: number;
      total: number;
    }[];
    summary: {
      totalSpend: number;
      averageJobCost: number;
      mostExpensiveJob: {
        id: string;
        name: string;
        cost: number;
      };
    }
  }
}
```

### GET `/api/costs/summary`
Get cost summary and budget information.

**Response:**
```typescript
{
  success: true,
  data: {
    currentMonth: {
      spent: number;
      budget: number;
      remaining: number;
      daysRemaining: number;
      projectedTotal: number;
    };
    alerts: {
      type: 'warning' | 'critical';
      message: string;
      threshold: number;
    }[];
  }
}
```

---

## 6. Notifications API

### GET `/api/notifications`
Get user notifications.

**Query Parameters:**
```typescript
{
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    notifications: {
      id: string;
      type: 'job_complete' | 'job_failed' | 'cost_alert' | 'system';
      title: string;
      message: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      read: boolean;
      actionUrl?: string;
      createdAt: string;
    }[];
  },
  meta: {
    unreadCount: number;
    pagination: { ... }
  }
}
```

### PATCH `/api/notifications/[id]/read`
Mark notification as read.

---

## Database Schema

### Technology Choice
**Recommended:** PostgreSQL (via Supabase for easy setup, or self-hosted)

**ORM:** Prisma (recommended) or Drizzle ORM

### Schema Definition (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User & Authentication
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  organization  String?
  role          UserRole  @default(USER)
  
  // Subscription & billing
  subscriptionTier  SubscriptionTier @default(FREE)
  monthlyBudget     Decimal?         @db.Decimal(10, 2)
  
  // Relationships
  datasets      Dataset[]
  jobs          TrainingJob[]
  models        ModelArtifact[]
  notifications Notification[]
  costRecords   CostRecord[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
}

enum UserRole {
  USER
  ADMIN
  BILLING_ADMIN
}

enum SubscriptionTier {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

// ============================================
// Datasets
// ============================================

model Dataset {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Metadata
  name        String
  description String        @db.Text
  format      DatasetFormat
  status      DatasetStatus @default(UPLOADING)
  
  // Storage
  s3Bucket    String
  s3Key       String        @unique
  fileSize    BigInt
  fileName    String
  
  // Dataset statistics
  totalTrainingPairs     Int?
  totalValidationPairs   Int?
  totalTokens            BigInt?
  avgTurnsPerConversation Float?
  avgTokensPerTurn       Float?
  
  // Validation
  trainingReady Boolean     @default(false)
  validatedAt   DateTime?
  validationErrors Json?     // Array of validation errors
  
  // Sample data (for preview)
  sampleData    Json?       // First 3 conversations
  
  // Processing timestamps
  uploadedAt    DateTime    @default(now())
  processedAt   DateTime?
  
  // Error tracking
  errorMessage  String?     @db.Text
  
  // Soft delete
  deletedAt     DateTime?
  
  // Relationships
  jobs          TrainingJob[]
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@index([userId, status])
  @@index([userId, createdAt])
}

enum DatasetFormat {
  BRIGHTRUN_LORA_V4
  BRIGHTRUN_LORA_V3
}

enum DatasetStatus {
  UPLOADING
  VALIDATING
  READY
  ERROR
}

// ============================================
// Training Jobs
// ============================================

model TrainingJob {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  datasetId   String
  dataset     Dataset         @relation(fields: [datasetId], references: [id], onDelete: Restrict)
  
  // Configuration
  presetId    String          // 'conservative' | 'balanced' | 'aggressive' | 'custom'
  hyperparameters Json        // HyperparameterConfig object
  gpuConfig   Json            // GPUConfig object
  
  // Status & Progress
  status      JobStatus       @default(QUEUED)
  currentStage JobStage       @default(QUEUED)
  progress    Decimal         @default(0) @db.Decimal(5, 2) // 0-100
  
  // Training progress
  currentEpoch Int?
  totalEpochs  Int
  currentStep  Int?
  totalSteps   Int?
  
  // Current metrics (denormalized for quick access)
  currentMetrics Json?        // CurrentMetrics object
  
  // Time tracking
  queuedAt    DateTime        @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  estimatedCompletionAt DateTime?
  
  // Cost tracking
  currentCost          Decimal @default(0) @db.Decimal(10, 2)
  estimatedTotalCost   Decimal @db.Decimal(10, 2)
  finalCost            Decimal? @db.Decimal(10, 2)
  
  // Error handling
  errorMessage String?        @db.Text
  errorStack   String?        @db.Text
  retryCount   Int            @default(0)
  
  // External training service
  externalJobId String?       @unique // ID from GPU cluster API
  
  // Artifact reference
  artifactId  String?         @unique
  artifact    ModelArtifact?  @relation(fields: [artifactId], references: [id])
  
  // Relationships
  metricsHistory MetricsPoint[]
  checkpoints    Checkpoint[]
  logs           JobLog[]
  costRecords    CostRecord[]
  
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  
  @@index([userId, status])
  @@index([status, queuedAt])
  @@index([externalJobId])
}

enum JobStatus {
  QUEUED
  INITIALIZING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum JobStage {
  QUEUED
  INITIALIZING
  TRAINING
  VALIDATING
  SAVING
  COMPLETED
}

// ============================================
// Training Metrics (Time Series)
// ============================================

model MetricsPoint {
  id        String      @id @default(cuid())
  jobId     String
  job       TrainingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  timestamp DateTime    @default(now())
  
  // Progress
  epoch     Int
  step      Int
  
  // Loss metrics
  trainingLoss   Decimal  @db.Decimal(10, 6)
  validationLoss Decimal? @db.Decimal(10, 6)
  
  // Training metrics
  learningRate   Decimal  @db.Decimal(12, 10)
  gradientNorm   Decimal? @db.Decimal(10, 6)
  
  // Performance metrics
  throughput     Decimal? @db.Decimal(10, 2) // tokens/sec
  gpuUtilization Decimal? @db.Decimal(5, 2)  // percentage
  
  @@index([jobId, timestamp])
  @@index([jobId, step])
}

// ============================================
// Checkpoints
// ============================================

model Checkpoint {
  id        String      @id @default(cuid())
  jobId     String
  job       TrainingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  step      Int
  epoch     Int
  loss      Decimal     @db.Decimal(10, 6)
  
  // Storage
  s3Bucket  String
  s3Key     String
  fileSize  BigInt
  
  createdAt DateTime    @default(now())
  
  @@index([jobId, step])
}

// ============================================
// Job Logs
// ============================================

model JobLog {
  id        String      @id @default(cuid())
  jobId     String
  job       TrainingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  timestamp DateTime    @default(now())
  level     LogLevel
  message   String      @db.Text
  metadata  Json?
  
  @@index([jobId, timestamp])
}

enum LogLevel {
  INFO
  WARNING
  ERROR
}

// ============================================
// Model Artifacts
// ============================================

model ModelArtifact {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  jobId       String      @unique
  job         TrainingJob?
  
  datasetId   String
  
  // Metadata
  name        String
  version     String
  description String?     @db.Text
  
  // Status
  status      ModelStatus @default(STORED)
  deployedAt  DateTime?
  
  // Quality metrics
  qualityMetrics Json      // QualityMetrics object
  
  // Training summary
  trainingSummary Json     // TrainingSummary object
  
  // Configuration reference
  configuration Json       // Configuration object
  
  // Artifacts storage
  artifacts   Json         // Artifacts object with S3 keys
  
  // Version lineage
  parentModelId String?
  parentModel   ModelArtifact? @relation("ModelVersions", fields: [parentModelId], references: [id])
  childModels   ModelArtifact[] @relation("ModelVersions")
  
  // Soft delete
  deletedAt   DateTime?
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([userId, status])
  @@index([userId, createdAt])
}

enum ModelStatus {
  STORED
  DEPLOYED
  ARCHIVED
}

// ============================================
// Cost Tracking
// ============================================

model CostRecord {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  jobId     String?
  job       TrainingJob? @relation(fields: [jobId], references: [id], onDelete: SetNull)
  
  // Cost breakdown
  costType  CostType
  amount    Decimal     @db.Decimal(10, 2)
  
  // Details
  details   Json?       // Additional cost details (GPU hours, storage GB, etc.)
  
  // Time period
  billingPeriod DateTime  // Start of billing period (day/week/month)
  recordedAt    DateTime  @default(now())
  
  @@index([userId, billingPeriod])
  @@index([jobId])
}

enum CostType {
  COMPUTE
  STORAGE
  DATA_TRANSFER
  API_CALLS
}

// ============================================
// Notifications
// ============================================

model Notification {
  id        String             @id @default(cuid())
  userId    String
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type      NotificationType
  title     String
  message   String             @db.Text
  priority  NotificationPriority @default(MEDIUM)
  
  read      Boolean            @default(false)
  actionUrl String?
  
  metadata  Json?              // Additional notification data
  
  createdAt DateTime           @default(now())
  
  @@index([userId, read, createdAt])
}

enum NotificationType {
  JOB_COMPLETE
  JOB_FAILED
  COST_ALERT
  SYSTEM
  DATASET_READY
}

enum NotificationPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### Database Indexes

Critical indexes for performance:
```sql
-- User lookups
CREATE INDEX idx_users_email ON "User"(email);

-- Dataset queries
CREATE INDEX idx_datasets_user_status ON "Dataset"(userId, status);
CREATE INDEX idx_datasets_user_created ON "Dataset"(userId, createdAt DESC);

-- Job queries
CREATE INDEX idx_jobs_user_status ON "TrainingJob"(userId, status);
CREATE INDEX idx_jobs_status_queued ON "TrainingJob"(status, queuedAt);
CREATE INDEX idx_jobs_external ON "TrainingJob"(externalJobId);

-- Metrics time series
CREATE INDEX idx_metrics_job_time ON "MetricsPoint"(jobId, timestamp);
CREATE INDEX idx_metrics_job_step ON "MetricsPoint"(jobId, step);

-- Logs
CREATE INDEX idx_logs_job_time ON "JobLog"(jobId, timestamp);

-- Models
CREATE INDEX idx_models_user_status ON "ModelArtifact"(userId, status);
CREATE INDEX idx_models_user_created ON "ModelArtifact"(userId, createdAt DESC);

-- Costs
CREATE INDEX idx_costs_user_period ON "CostRecord"(userId, billingPeriod);

-- Notifications
CREATE INDEX idx_notifications_user_read ON "Notification"(userId, read, createdAt DESC);
```

---

## Authentication & Authorization

### Authentication Strategy

**Recommended:** NextAuth.js v5 (Auth.js) with App Router support

**Alternative:** Supabase Auth (if using Supabase for database)

### NextAuth.js Configuration

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    signUp: "/signup",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
```

### Route Protection

```typescript
// middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/signup");

  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### API Route Protection

```typescript
// lib/api-auth.ts
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function requireAuth(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }
  
  return session.user;
}

// Usage in API route
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user; // Auth error
  
  // Proceed with authenticated request
  const datasets = await prisma.dataset.findMany({
    where: { userId: user.id },
  });
  
  return NextResponse.json({ success: true, data: { datasets } });
}
```

---

## Real-Time Features

### Technology: Server-Sent Events (SSE)

SSE is simpler than WebSockets and perfect for one-way server→client streaming.

### Implementation: Training Progress Stream

```typescript
// app/api/jobs/[id]/stream/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs"; // Required for streaming

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth(request);
  if (user instanceof Response) return user;

  const jobId = params.id;

  // Verify job ownership
  const job = await prisma.trainingJob.findFirst({
    where: { id: jobId, userId: user.id },
  });

  if (!job) {
    return new Response(
      JSON.stringify({ error: "Job not found" }),
      { status: 404 }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const data = `data: ${JSON.stringify({ 
        event: 'connected', 
        jobId 
      })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Poll for updates every 2 seconds
      intervalId = setInterval(async () => {
        try {
          const updatedJob = await prisma.trainingJob.findUnique({
            where: { id: jobId },
            include: {
              metricsHistory: {
                orderBy: { timestamp: "desc" },
                take: 1,
              },
            },
          });

          if (!updatedJob) {
            controller.close();
            return;
          }

          // Send progress update
          const progressEvent = `event: progress\ndata: ${JSON.stringify({
            progress: updatedJob.progress,
            currentEpoch: updatedJob.currentEpoch,
            currentStep: updatedJob.currentStep,
            totalSteps: updatedJob.totalSteps,
          })}\n\n`;
          controller.enqueue(encoder.encode(progressEvent));

          // Send metrics update if available
          if (updatedJob.metricsHistory[0]) {
            const metrics = updatedJob.metricsHistory[0];
            const metricsEvent = `event: metrics\ndata: ${JSON.stringify({
              trainingLoss: metrics.trainingLoss,
              validationLoss: metrics.validationLoss,
              learningRate: metrics.learningRate,
              throughput: metrics.throughput,
            })}\n\n`;
            controller.enqueue(encoder.encode(metricsEvent));
          }

          // Send cost update
          const costEvent = `event: cost\ndata: ${JSON.stringify({
            currentCost: updatedJob.currentCost,
            estimatedTotal: updatedJob.estimatedTotalCost,
          })}\n\n`;
          controller.enqueue(encoder.encode(costEvent));

          // Check if completed
          if (updatedJob.status === "COMPLETED") {
            const completeEvent = `event: complete\ndata: ${JSON.stringify({
              jobId,
              artifactId: updatedJob.artifactId,
              finalCost: updatedJob.finalCost,
            })}\n\n`;
            controller.enqueue(encoder.encode(completeEvent));
            
            clearInterval(intervalId);
            controller.close();
          }

          // Check if failed
          if (updatedJob.status === "FAILED") {
            const errorEvent = `event: error\ndata: ${JSON.stringify({
              error: updatedJob.errorMessage,
              canRetry: updatedJob.retryCount < 3,
            })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
            
            clearInterval(intervalId);
            controller.close();
          }

        } catch (error) {
          console.error("SSE polling error:", error);
          clearInterval(intervalId);
          controller.error(error);
        }
      }, 2000); // Poll every 2 seconds
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### Client-Side Hook

```typescript
// hooks/useJobStream.ts
import { useEffect, useState, useRef } from 'react';

interface JobProgress {
  progress: number;
  currentEpoch?: number;
  currentStep?: number;
  totalSteps?: number;
}

interface JobMetrics {
  trainingLoss: number;
  validationLoss?: number;
  learningRate: number;
  throughput?: number;
}

interface JobCost {
  currentCost: number;
  estimatedTotal: number;
}

export function useJobStream(jobId: string) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [metrics, setMetrics] = useState<JobMetrics | null>(null);
  const [cost, setCost] = useState<JobCost | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setProgress(data);
    });

    eventSource.addEventListener('metrics', (e) => {
      const data = JSON.parse(e.data);
      setMetrics(data);
    });

    eventSource.addEventListener('cost', (e) => {
      const data = JSON.parse(e.data);
      setCost(data);
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setIsComplete(true);
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse(e.data);
      setError(data.error);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setError('Connection lost');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return { progress, metrics, cost, isComplete, error };
}
```

---

## File Storage & Management

### Technology: S3-Compatible Object Storage

**Options:**
- AWS S3 (production)
- Cloudflare R2 (cost-effective, no egress fees)
- Supabase Storage (if using Supabase)
- MinIO (self-hosted)

### Storage Structure

```
brightrun-lora-storage/
├── datasets/
│   └── {userId}/
│       └── {datasetId}/
│           └── dataset.jsonl
│
├── checkpoints/
│   └── {jobId}/
│       ├── checkpoint-epoch-1/
│       ├── checkpoint-epoch-2/
│       └── ...
│
└── models/
    └── {artifactId}/
        ├── adapter_model.safetensors
        ├── adapter_config.json
        ├── tokenizer.json
        └── metadata.json
```

### S3 Client Setup

```typescript
// lib/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

// Generate presigned upload URL
export async function generateUploadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Generate presigned download URL
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Upload file directly (server-side)
export async function uploadFile(
  key: string,
  body: Buffer | ReadableStream,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}
```

### Dataset Upload Flow

```typescript
// app/api/datasets/route.ts
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json();
  const { name, description, format, fileSize, fileName } = body;

  // Create dataset record
  const dataset = await prisma.dataset.create({
    data: {
      userId: user.id,
      name,
      description,
      format,
      status: "UPLOADING",
      s3Bucket: BUCKET_NAME,
      s3Key: `datasets/${user.id}/${cuid()}/dataset.jsonl`,
      fileSize: BigInt(fileSize),
      fileName,
    },
  });

  // Generate presigned upload URL
  const uploadUrl = await generateUploadUrl(dataset.s3Key);

  return NextResponse.json({
    success: true,
    data: {
      datasetId: dataset.id,
      uploadUrl,
    },
  });
}

// app/api/datasets/[id]/confirm/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth(request);
  if (user instanceof Response) return user;

  const datasetId = params.id;

  // Update status to validating
  await prisma.dataset.update({
    where: { id: datasetId, userId: user.id },
    data: { status: "VALIDATING" },
  });

  // Trigger async validation job
  await queueDatasetValidation(datasetId);

  return NextResponse.json({
    success: true,
    data: { message: "Validation started" },
  });
}
```

---

## Training Job Orchestration

### Architecture

```
Next.js API → Redis Queue (BullMQ) → Worker Process → External GPU Cluster
```

### Queue Setup (BullMQ)

```typescript
// lib/queue.ts
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL!);

// Training job queue
export const trainingQueue = new Queue("training-jobs", { connection });

// Job types
interface TrainingJobData {
  jobId: string;
  userId: string;
  datasetId: string;
  hyperparameters: any;
  gpuConfig: any;
}

// Add job to queue
export async function queueTrainingJob(jobData: TrainingJobData) {
  await trainingQueue.add("train", jobData, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}

// Worker (separate process: npm run worker)
const worker = new Worker<TrainingJobData>(
  "training-jobs",
  async (job: Job<TrainingJobData>) => {
    console.log(`Processing training job: ${job.data.jobId}`);

    // 1. Update job status to INITIALIZING
    await prisma.trainingJob.update({
      where: { id: job.data.jobId },
      data: { status: "INITIALIZING" },
    });

    // 2. Download dataset from S3
    const dataset = await prisma.dataset.findUnique({
      where: { id: job.data.datasetId },
    });
    
    // 3. Submit job to external GPU cluster
    const externalJobId = await submitToGPUCluster({
      datasetS3Key: dataset.s3Key,
      hyperparameters: job.data.hyperparameters,
      gpuConfig: job.data.gpuConfig,
      callbackUrl: `${process.env.APP_URL}/api/jobs/callback`,
    });

    // 4. Update job with external ID
    await prisma.trainingJob.update({
      where: { id: job.data.jobId },
      data: {
        status: "RUNNING",
        externalJobId,
        startedAt: new Date(),
      },
    });

    // 5. Start polling for updates
    await pollTrainingProgress(job.data.jobId, externalJobId);
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
  
  if (job) {
    await prisma.trainingJob.update({
      where: { id: job.data.jobId },
      data: {
        status: "FAILED",
        errorMessage: error.message,
      },
    });
  }
});
```

### External GPU Cluster Integration

```typescript
// lib/training-client.ts
import axios from "axios";

const GPU_CLUSTER_API = process.env.GPU_CLUSTER_API_URL!;
const GPU_CLUSTER_API_KEY = process.env.GPU_CLUSTER_API_KEY!;

interface SubmitJobParams {
  datasetS3Key: string;
  hyperparameters: any;
  gpuConfig: any;
  callbackUrl: string;
}

// Submit job to GPU cluster
export async function submitToGPUCluster(
  params: SubmitJobParams
): Promise<string> {
  const response = await axios.post(
    `${GPU_CLUSTER_API}/jobs`,
    {
      dataset_url: `s3://${BUCKET_NAME}/${params.datasetS3Key}`,
      hyperparameters: params.hyperparameters,
      gpu_config: params.gpuConfig,
      callback_url: params.callbackUrl,
    },
    {
      headers: {
        "Authorization": `Bearer ${GPU_CLUSTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.job_id;
}

// Poll for job status
export async function getJobStatus(externalJobId: string) {
  const response = await axios.get(
    `${GPU_CLUSTER_API}/jobs/${externalJobId}`,
    {
      headers: {
        "Authorization": `Bearer ${GPU_CLUSTER_API_KEY}`,
      },
    }
  );

  return response.data;
}

// Cancel job
export async function cancelJob(externalJobId: string) {
  await axios.post(
    `${GPU_CLUSTER_API}/jobs/${externalJobId}/cancel`,
    {},
    {
      headers: {
        "Authorization": `Bearer ${GPU_CLUSTER_API_KEY}`,
      },
    }
  );
}

// Poll for updates and sync to database
export async function pollTrainingProgress(
  jobId: string,
  externalJobId: string
) {
  const pollInterval = setInterval(async () => {
    try {
      const status = await getJobStatus(externalJobId);

      // Update database with latest metrics
      await prisma.trainingJob.update({
        where: { id: jobId },
        data: {
          progress: status.progress,
          currentEpoch: status.current_epoch,
          currentStep: status.current_step,
          currentMetrics: status.metrics,
          currentCost: status.cost,
        },
      });

      // Store metrics history
      if (status.metrics) {
        await prisma.metricsPoint.create({
          data: {
            jobId,
            epoch: status.current_epoch,
            step: status.current_step,
            trainingLoss: status.metrics.training_loss,
            validationLoss: status.metrics.validation_loss,
            learningRate: status.metrics.learning_rate,
            throughput: status.metrics.throughput,
            gpuUtilization: status.metrics.gpu_utilization,
          },
        });
      }

      // Check if completed
      if (status.status === "completed") {
        clearInterval(pollInterval);
        await handleJobCompletion(jobId, status);
      }

      // Check if failed
      if (status.status === "failed") {
        clearInterval(pollInterval);
        await prisma.trainingJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            errorMessage: status.error_message,
          },
        });
      }

    } catch (error) {
      console.error("Polling error:", error);
    }
  }, 5000); // Poll every 5 seconds
}

// Handle job completion
async function handleJobCompletion(jobId: string, status: any) {
  // 1. Download artifacts from GPU cluster
  const artifactUrls = status.artifact_urls;

  // 2. Upload to our S3 bucket
  const artifactId = cuid();
  const s3Keys = await downloadAndUploadArtifacts(artifactUrls, artifactId);

  // 3. Create model artifact record
  const artifact = await prisma.modelArtifact.create({
    data: {
      id: artifactId,
      userId: status.user_id,
      jobId,
      datasetId: status.dataset_id,
      name: `Model from ${status.dataset_name}`,
      version: "1.0.0",
      status: "STORED",
      qualityMetrics: status.quality_metrics,
      trainingSummary: status.training_summary,
      configuration: status.configuration,
      artifacts: s3Keys,
    },
  });

  // 4. Update job as completed
  await prisma.trainingJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      artifactId: artifact.id,
      finalCost: status.final_cost,
    },
  });

  // 5. Create notification
  await prisma.notification.create({
    data: {
      userId: status.user_id,
      type: "JOB_COMPLETE",
      title: "Training Completed!",
      message: `Your LoRA model has been successfully trained.`,
      priority: "HIGH",
      actionUrl: `/models/${artifact.id}`,
    },
  });
}
```

---

## Cost Tracking & Billing

### Cost Calculation

```typescript
// lib/cost-calculator.ts

interface CostBreakdown {
  compute: {
    hours: number;
    ratePerHour: number;
    total: number;
  };
  storage: {
    gb: number;
    ratePerGb: number;
    total: number;
  };
  dataTransfer: {
    gb: number;
    ratePerGb: number;
    total: number;
  };
  total: number;
}

// GPU pricing (per hour)
const GPU_RATES = {
  "a100-40gb": 2.50,
  "a100-80gb": 3.20,
  "h100-80gb": 4.50,
};

// Storage pricing
const STORAGE_RATE_PER_GB_MONTH = 0.023; // S3 standard
const DATA_TRANSFER_RATE_PER_GB = 0.09;  // Egress

export function calculateTrainingCost(
  gpuConfig: { instanceType: string; numGPUs: number },
  estimatedHours: number,
  datasetSizeGB: number
): CostBreakdown {
  const gpuRate = GPU_RATES[gpuConfig.instanceType] * gpuConfig.numGPUs;
  
  const compute = {
    hours: estimatedHours,
    ratePerHour: gpuRate,
    total: estimatedHours * gpuRate,
  };

  const storage = {
    gb: datasetSizeGB + 5, // Dataset + checkpoints
    ratePerGb: STORAGE_RATE_PER_GB_MONTH,
    total: (datasetSizeGB + 5) * STORAGE_RATE_PER_GB_MONTH,
  };

  const dataTransfer = {
    gb: datasetSizeGB * 2, // Upload + download
    ratePerGb: DATA_TRANSFER_RATE_PER_GB,
    total: datasetSizeGB * 2 * DATA_TRANSFER_RATE_PER_GB,
  };

  return {
    compute,
    storage,
    dataTransfer,
    total: compute.total + storage.total + dataTransfer.total,
  };
}

// Track costs in real-time
export async function trackJobCost(
  jobId: string,
  userId: string,
  costType: "COMPUTE" | "STORAGE" | "DATA_TRANSFER",
  amount: number,
  details?: any
) {
  await prisma.costRecord.create({
    data: {
      userId,
      jobId,
      costType,
      amount,
      details,
      billingPeriod: startOfDay(new Date()),
    },
  });

  // Update job current cost
  const totalCost = await prisma.costRecord.aggregate({
    where: { jobId },
    _sum: { amount: true },
  });

  await prisma.trainingJob.update({
    where: { id: jobId },
    data: { currentCost: totalCost._sum.amount || 0 },
  });
}
```

### Budget Alerts

```typescript
// lib/budget-alerts.ts

export async function checkBudgetAlerts(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.monthlyBudget) return;

  // Get current month spending
  const currentMonth = startOfMonth(new Date());
  const spending = await prisma.costRecord.aggregate({
    where: {
      userId,
      billingPeriod: { gte: currentMonth },
    },
    _sum: { amount: true },
  });

  const totalSpent = spending._sum.amount || 0;
  const budget = user.monthlyBudget;
  const percentUsed = (totalSpent / budget) * 100;

  // Alert at 80%
  if (percentUsed >= 80 && percentUsed < 100) {
    await prisma.notification.create({
      data: {
        userId,
        type: "COST_ALERT",
        title: "Budget Warning",
        message: `You've used ${percentUsed.toFixed(0)}% of your monthly budget.`,
        priority: "HIGH",
      },
    });
  }

  // Alert at 100%
  if (percentUsed >= 100) {
    await prisma.notification.create({
      data: {
        userId,
        type: "COST_ALERT",
        title: "Budget Exceeded",
        message: `You've exceeded your monthly budget of $${budget}.`,
        priority: "CRITICAL",
      },
    });
  }
}
```

---

## Testing Strategy

### Test Pyramid

```
           /\
          /E2E\          ← Playwright (critical user flows)
         /______\
        /        \
       /Integration\     ← API tests, DB tests
      /____________\
     /              \
    /   Unit Tests   \   ← Component tests, utility functions
   /__________________\
```

### Unit Tests (Vitest + React Testing Library)

```typescript
// components/datasets/__tests__/DatasetCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DatasetCard } from '../DatasetCard';

describe('DatasetCard', () => {
  const mockDataset = {
    id: 'dataset-001',
    name: 'Test Dataset',
    totalTrainingPairs: 1000,
    trainingReady: true,
    // ... other fields
  };

  it('renders dataset information correctly', () => {
    render(<DatasetCard dataset={mockDataset} />);
    
    expect(screen.getByText('Test Dataset')).toBeInTheDocument();
    expect(screen.getByText('1,000 pairs')).toBeInTheDocument();
  });

  it('calls onStartTraining when button clicked', () => {
    const handleStartTraining = vi.fn();
    render(
      <DatasetCard 
        dataset={mockDataset} 
        onStartTraining={handleStartTraining} 
      />
    );
    
    fireEvent.click(screen.getByText('Start Training'));
    expect(handleStartTraining).toHaveBeenCalledWith(mockDataset);
  });
});
```

### Integration Tests (API Routes)

```typescript
// app/api/datasets/__tests__/route.test.ts
import { POST } from '../route';
import { prisma } from '@/lib/db';

describe('POST /api/datasets', () => {
  it('creates dataset and returns upload URL', async () => {
    const request = new Request('http://localhost/api/datasets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        name: 'Test Dataset',
        description: 'Test',
        format: 'BRIGHTRUN_LORA_V4',
        fileSize: 1024000,
        fileName: 'test.jsonl',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.datasetId).toBeDefined();
    expect(data.data.uploadUrl).toContain('s3');
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/training-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete training pipeline flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to datasets
  await page.click('text=Datasets');
  await expect(page).toHaveURL('/datasets');

  // Start training
  await page.click('button:has-text("Start Training")').first();
  await expect(page).toHaveURL(/\/training\/configure/);

  // Select preset
  await page.click('[data-preset="balanced"]');

  // Launch training
  await page.click('text=Start Training');
  await page.click('text=Confirm'); // Confirmation modal

  // Wait for redirect to monitor
  await expect(page).toHaveURL(/\/training\/jobs\//);

  // Check progress indicator exists
  await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
});
```

---

## Deployment & DevOps

### Environment Variables

```bash
# .env.local (development)
# .env.production (production)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/brightrun

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=brightrun-lora-storage

# Redis
REDIS_URL=redis://localhost:6379

# GPU Cluster API
GPU_CLUSTER_API_URL=https://gpu-cluster.example.com/api
GPU_CLUSTER_API_KEY=your-api-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Docker Setup

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/brightrun
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: brightrun
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  worker:
    build: .
    command: npm run worker
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/brightrun
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
  redis_data:
```

### Deployment Checklist

- [ ] Set up production database (PostgreSQL)
- [ ] Configure S3 bucket with proper CORS and lifecycle policies
- [ ] Set up Redis instance (managed service recommended)
- [ ] Configure environment variables in hosting platform
- [ ] Set up CI/CD pipeline (GitHub Actions, Vercel, etc.)
- [ ] Configure domain and SSL certificates
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure backups for database and S3
- [ ] Set up log aggregation
- [ ] Configure CDN for static assets
- [ ] Set up rate limiting and DDoS protection
- [ ] Run database migrations
- [ ] Test SSE connections work through load balancer
- [ ] Set up worker process (separate dyno/container)

---

## Migration Checklist

### Phase 1: Project Setup (Week 1)
- [ ] Create Next.js 14 project with TypeScript and Tailwind
- [ ] Copy all shadcn/ui components to new project
- [ ] Set up Prisma with PostgreSQL
- [ ] Configure NextAuth.js
- [ ] Set up S3 client
- [ ] Configure Redis and BullMQ

### Phase 2: Frontend Migration (Week 2-3)
- [ ] Create route structure (app router)
- [ ] Migrate DashboardLayout to root layout
- [ ] Convert P01 (Dashboard) to Next.js page
- [ ] Convert P02 (Datasets) to Next.js page
- [ ] Convert P03 (Training Configurator) to Next.js page
- [ ] Convert P04 (Training Monitor) to Next.js page
- [ ] Convert P05 (Model Artifacts) to Next.js page
- [ ] Replace all mock data imports with SWR hooks
- [ ] Update navigation to use Next.js router
- [ ] Test all page transitions

### Phase 3: Backend Implementation (Week 3-5)
- [ ] Implement authentication API routes
- [ ] Implement datasets API (CRUD + upload)
- [ ] Implement dataset validation pipeline
- [ ] Implement training jobs API
- [ ] Implement SSE streaming for job progress
- [ ] Implement models/artifacts API
- [ ] Implement cost tracking API
- [ ] Implement notifications API
- [ ] Set up BullMQ worker process
- [ ] Integrate with external GPU cluster API

### Phase 4: Real-Time Features (Week 5-6)
- [ ] Implement SSE endpoint for training progress
- [ ] Create useJobStream hook
- [ ] Update P04 to use real-time streaming
- [ ] Test real-time updates with multiple concurrent jobs
- [ ] Implement cost tracking updates
- [ ] Implement notifications system

### Phase 5: File Storage (Week 6)
- [ ] Implement presigned URL generation
- [ ] Implement dataset upload flow
- [ ] Implement model artifact download
- [ ] Set up S3 lifecycle policies
- [ ] Test large file uploads (>1GB)

### Phase 6: Testing (Week 7)
- [ ] Write unit tests for critical components
- [ ] Write API integration tests
- [ ] Write E2E tests for main user flows
- [ ] Perform load testing on SSE endpoints
- [ ] Test error handling and edge cases

### Phase 7: Deployment (Week 8)
- [ ] Set up production database
- [ ] Deploy to staging environment
- [ ] Run migration scripts
- [ ] Perform UAT testing
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Set up alerting

---

## Key Differences from Wireframe

### What Stays the Same
✅ All UI components (shadcn/ui library)  
✅ All visual designs and layouts  
✅ Component structure and organization  
✅ User journey and navigation flow  
✅ Feature set (datasets, training, monitoring, artifacts)  

### What Changes
🔄 **Routing:** State-based → Next.js App Router  
🔄 **Data Fetching:** useState + mock data → SWR + API calls  
🔄 **Authentication:** None → NextAuth.js  
🔄 **Real-time Updates:** Simulated → Server-Sent Events  
🔄 **File Handling:** Mock → S3 presigned URLs  
🔄 **Cost Tracking:** Static calculations → Real-time DB updates  

### What Gets Added
➕ Database (PostgreSQL with Prisma)  
➕ API routes (REST endpoints)  
➕ Authentication system  
➕ Job queue (BullMQ + Redis)  
➕ External service integration (GPU cluster)  
➕ Real-time streaming (SSE)  
➕ File storage (S3)  
➕ Notifications system  
➕ Cost tracking & billing  
➕ Error handling & logging  

---

## Success Criteria

### Functional Requirements
- [ ] Users can upload and validate datasets
- [ ] Users can configure and launch training jobs
- [ ] Users can monitor training progress in real-time
- [ ] Users can download trained model artifacts
- [ ] Cost tracking updates in real-time
- [ ] Notifications work correctly
- [ ] All navigation flows work as designed

### Non-Functional Requirements
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms (p95)
- [ ] SSE updates arrive within 5 seconds
- [ ] Supports 100+ concurrent users
- [ ] 99.9% uptime SLA
- [ ] Database queries optimized with indexes
- [ ] All sensitive data encrypted

### User Experience
- [ ] UI matches wireframe designs exactly
- [ ] All interactions feel responsive
- [ ] Error messages are clear and actionable
- [ ] Loading states are smooth
- [ ] Mobile responsive (if applicable)
- [ ] Accessibility compliance (WCAG 2.1 AA)

---

## Additional Resources

### Documentation to Create
1. API Reference (OpenAPI/Swagger spec)
2. Database Schema Documentation
3. Developer Onboarding Guide
4. Deployment Runbook
5. Troubleshooting Guide

### External Integrations Needed
1. GPU Cluster API (vendor-specific documentation)
2. Payment Processing (if monetizing)
3. Email Service (for notifications)
4. Analytics Platform
5. Error Tracking (Sentry)

### Open Questions for Implementation
1. **GPU Cluster:** Which provider? (AWS SageMaker, Modal, RunPod, etc.)
2. **Pricing Model:** Pay-per-use vs subscription tiers?
3. **Model Deployment:** Support deployment or download-only?
4. **Multi-tenancy:** Team accounts with role-based access?
5. **Base Models:** Support multiple base models beyond Llama 3 70B?

---

## Conclusion

This specification provides a complete blueprint for converting the BrightRun LoRA Training Platform wireframe (Vite) into a production Next.js 14 application with full backend functionality. The implementation preserves all UI/UX from the wireframe while adding robust backend services for authentication, data persistence, real-time updates, and external training service integration.

The estimated timeline for a team of 2-3 developers is **8 weeks** from start to production deployment.

**Next Steps:**
1. Review and approve this specification
2. Set up development environment
3. Begin Phase 1 (Project Setup)
4. Iterate based on stakeholder feedback

---

**Document Version:** 8.0  
**Last Updated:** December 20, 2024  
**Author:** Claude (AI Assistant)  
**Status:** Ready for Implementation
