# Bright Run LoRA Pipeline - Functional Requirements (Part B)

## Document Information
- **Part**: B (Continuation)
- **Sections**: 4, 5, 8, 9, 10, 11
- **Companion Document**: `03-pipeline-functional-requirements.md` (Sections 1-3, 6-7)
- **Status**: Enhanced Functional Requirements
- **Version**: 1.0
- **Last Updated**: December 17, 2025

## Integration Instructions
This document contains enhanced functional requirements for Sections 4, 5, 8-11.
It is designed to be used in conjunction with `03-pipeline-functional-requirements.md`.

For complete functional requirements, reference both documents:
- Part A (Sections 1-3, 6-7): Training job lifecycle, quality validation, cost management
- Part B (Sections 4-5, 8-11): Artifacts, comparison, collaboration, system requirements

## Document Contents
- [Section 4: Model Artifacts & Downloads](#4-model-artifacts--downloads)
- [Section 5: Training Comparison & Optimization](#5-training-comparison--optimization)
- [Section 8: Team Collaboration & Notifications](#8-team-collaboration--notifications)
- [Section 9: System Integration Requirements](#9-system-integration-requirements)
- [Section 10: Operational Requirements](#10-operational-requirements)
- [Section 11: Security & Authentication Requirements](#11-security--authentication-requirements)

---

# 4. Model Artifacts & Downloads

## 4.1 Artifact Storage & Organization

### FR 4.1.1: Artifact Storage Structure
**Description**: Implement a hierarchical storage system for training artifacts that supports efficient organization, retrieval, and lifecycle management of model checkpoints, adapters, logs, and metadata.

**Impact Weighting**: High (Critical for delivery workflow and model versioning)

**Priority**: P0 - Critical

**Dependencies**:
- Training job execution (Part A: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\03-pipeline-functional-requirements.md`, Section 1)
- Cost tracking (Part A: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\03-pipeline-functional-requirements.md`, Section 6)
- Supabase Storage configuration
- SAOL library (`C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\`)

**User Stories**: US4.1.1, US4.1.2

**Tasks**:
1. Define storage bucket structure and naming conventions
2. Implement artifact upload handlers with progress tracking
3. Create metadata indexing system linking artifacts to training jobs
4. Implement automatic storage lifecycle policies (retention, archival)
5. Add versioning support for incremental checkpoint management
6. Create artifact validation and integrity checking
7. Implement storage quota monitoring and alerts

**User Story Acceptance Criteria**:

#### US4.1.1: As a data scientist, I need artifacts automatically organized by job/checkpoint so I can quickly locate specific training outputs
- Given a completed training job
- When artifacts are uploaded from RunPod
- Then they are stored in hierarchical structure: `/{client_id}/{project_id}/{job_id}/{checkpoint_step}/`
- And metadata includes: job_id, step, timestamp, file_type, size, validation_hash
- And artifacts are indexed in database with searchable metadata
- And I can query artifacts by job_id, date range, or checkpoint step

#### US4.1.2: As a system administrator, I need automatic artifact lifecycle management to optimize storage costs
- Given configured retention policies
- When artifacts reach retention threshold (default: 90 days for checkpoints, 180 days for final models)
- Then system automatically archives to cold storage or deletes per policy
- And lifecycle actions are logged with audit trail
- And storage quota alerts trigger at 80% capacity
- And I can override retention for critical artifacts

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Artifact registry table
CREATE TABLE training_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  artifact_type VARCHAR(50) NOT NULL CHECK (artifact_type IN ('checkpoint', 'adapter', 'merged_model', 'logs', 'metrics', 'config')),
  checkpoint_step INTEGER,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  content_hash TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'model-artifacts',
  metadata JSONB DEFAULT '{}'::jsonb,
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'corrupted', 'archived')),
  lifecycle_status VARCHAR(20) DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'archived', 'scheduled_deletion', 'deleted')),
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(job_id, artifact_type, checkpoint_step, file_name)
);

CREATE INDEX idx_artifacts_job_id ON training_artifacts(job_id);
CREATE INDEX idx_artifacts_type_step ON training_artifacts(artifact_type, checkpoint_step);
CREATE INDEX idx_artifacts_lifecycle ON training_artifacts(lifecycle_status, retention_until);
CREATE INDEX idx_artifacts_validation ON training_artifacts(validation_status);

-- Storage quota tracking
CREATE TABLE storage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  quota_type VARCHAR(20) NOT NULL CHECK (quota_type IN ('active', 'archived', 'total')),
  quota_bytes BIGINT NOT NULL,
  used_bytes BIGINT DEFAULT 0,
  alert_threshold_percent INTEGER DEFAULT 80,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, quota_type)
);
```

##### UI/UX Requirements
- Artifact browser with filterable table (job, type, date, size, status)
- Visual storage quota meter with usage breakdown by artifact type
- Batch action toolbar (download, archive, delete, validate)
- Artifact detail panel showing metadata, validation status, and download options
- Lifecycle policy configuration interface with dry-run preview
- Storage analytics dashboard with trend graphs

##### API Requirements
```typescript
// Artifact upload endpoint
POST /api/artifacts/upload
Headers: Authorization: Bearer {token}
Body: FormData {
  job_id: UUID
  artifact_type: 'checkpoint' | 'adapter' | 'merged_model' | 'logs' | 'metrics' | 'config'
  checkpoint_step?: number
  file: File
  metadata?: Record<string, any>
}
Response: {
  artifact_id: UUID
  storage_path: string
  validation_status: string
  upload_duration_ms: number
}

// Artifact query endpoint
GET /api/artifacts?job_id={id}&type={type}&from={date}&to={date}
Response: {
  artifacts: Array<{
    id: UUID
    job_id: UUID
    artifact_type: string
    checkpoint_step: number | null
    file_name: string
    file_size_bytes: number
    storage_path: string
    validation_status: string
    lifecycle_status: string
    created_at: string
    download_url?: string
  }>
  total_count: number
  storage_used_bytes: number
}

// Artifact lifecycle action
POST /api/artifacts/{id}/lifecycle
Body: {
  action: 'archive' | 'delete' | 'restore' | 'extend_retention'
  retention_days?: number
}
Response: {
  success: boolean
  new_lifecycle_status: string
  retention_until: string
}
```

##### Calculation Requirements
- **Storage Path Generation**: `/{client_id}/{project_id}/{job_id}/{artifact_type}/{checkpoint_step || 'final'}/{file_name}`
- **Content Hash**: SHA-256 of file contents for integrity validation
- **Retention Date**: `created_at + retention_policy_days`
- **Quota Utilization**: `(used_bytes / quota_bytes) * 100`
- **Alert Threshold**: Trigger when `quota_utilization >= alert_threshold_percent`

##### Error Handling Requirements
- **Upload Failures**: Retry with exponential backoff (3 attempts), rollback DB record if all fail
- **Corrupted Files**: Mark validation_status='corrupted', send alert, quarantine file
- **Quota Exceeded**: Reject upload with 413 status, suggest archival candidates
- **Missing Dependencies**: Return 400 with specific missing reference (job_id, client_id)
- **Concurrent Modifications**: Use optimistic locking with row versioning
- **Storage Service Outages**: Queue operations with 24-hour retry window

##### Accessibility Requirements
- Artifact browser keyboard navigable (arrow keys, enter to select)
- Screen reader announcements for upload progress and completion
- High contrast mode for storage quota visualizations
- Alternative text for all artifact type icons
- Focus indicators on all interactive elements
- ARIA labels for dynamic content updates

##### Performance Requirements
- Artifact upload: Support files up to 50GB with resumable uploads
- Upload throughput: ≥100 MB/s on H100 PCIe connection
- Query response: <500ms for filtered artifact lists (up to 10,000 records)
- Metadata indexing: <2s after artifact upload completion
- Lifecycle job execution: Process 1,000 artifacts per minute
- Storage quota calculation: Update within 5 minutes of artifact changes

##### Analytics Requirements
```typescript
// Track artifact operations
analytics.track('artifact_uploaded', {
  artifact_id: string,
  artifact_type: string,
  file_size_bytes: number,
  upload_duration_ms: number,
  job_id: string,
  checkpoint_step: number | null
})

analytics.track('artifact_downloaded', {
  artifact_id: string,
  artifact_type: string,
  file_size_bytes: number,
  download_duration_ms: number
})

analytics.track('artifact_lifecycle_action', {
  artifact_id: string,
  action: 'archive' | 'delete' | 'restore',
  triggered_by: 'user' | 'policy' | 'system'
})

analytics.track('storage_quota_alert', {
  client_id: string,
  quota_type: string,
  utilization_percent: number,
  threshold_percent: number
})
```

---

### FR 4.1.2: Artifact Metadata Management
**Description**: Implement comprehensive metadata tagging, search, and filtering capabilities for training artifacts to enable efficient discovery and lineage tracking.

**Impact Weighting**: Medium-High (Enhances usability and traceability)

**Priority**: P1 - High

**Dependencies**:
- FR 4.1.1 (Artifact Storage Structure)
- Training job metadata (Part A: Section 1)
- SAOL library for database operations

**User Stories**: US4.1.1

**Tasks**:
1. Design extensible metadata schema supporting custom tags
2. Implement full-text search across artifact metadata
3. Create metadata inheritance from parent training job
4. Add metadata versioning for audit trail
5. Implement tag management UI with autocomplete
6. Create metadata export functionality (JSON, CSV)

**User Story Acceptance Criteria**:

#### US4.1.1: Enhanced metadata search capabilities
- Given artifacts with rich metadata
- When I search using filters (tags, date ranges, job properties)
- Then results are returned in <500ms with relevance ranking
- And I can save filter presets for repeated searches
- And search supports boolean operators (AND, OR, NOT)
- And I can export search results with metadata

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Extended metadata support
CREATE TABLE artifact_metadata_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES training_artifacts(id) ON DELETE CASCADE,
  tag_key VARCHAR(100) NOT NULL,
  tag_value TEXT NOT NULL,
  tag_type VARCHAR(20) DEFAULT 'custom' CHECK (tag_type IN ('system', 'user', 'inherited', 'custom')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_metadata_tags_artifact ON artifact_metadata_tags(artifact_id);
CREATE INDEX idx_metadata_tags_key_value ON artifact_metadata_tags(tag_key, tag_value);

-- Full-text search index
CREATE INDEX idx_artifacts_metadata_search ON training_artifacts USING GIN (metadata);
```

##### UI/UX Requirements
- Advanced search panel with tag selector (multi-select with autocomplete)
- Filter builder with visual query construction (drag-and-drop)
- Search result preview with highlighted matching metadata
- Saved search management (create, edit, delete, share)
- Metadata editor with inline validation
- Bulk metadata update capability

##### API Requirements
```typescript
// Metadata search endpoint
POST /api/artifacts/search
Body: {
  query?: string // Full-text search
  filters: {
    tags?: Record<string, string | string[]>
    artifact_type?: string[]
    date_range?: { from: string, to: string }
    job_properties?: Record<string, any>
  }
  sort?: { field: string, order: 'asc' | 'desc' }
  limit?: number
  offset?: number
}
Response: {
  results: Array<ArtifactWithMetadata>
  total_count: number
  facets: Record<string, Array<{ value: string, count: number }>>
}

// Bulk metadata update
PATCH /api/artifacts/metadata
Body: {
  artifact_ids: UUID[]
  add_tags?: Record<string, string>
  remove_tags?: string[]
  update_metadata?: Record<string, any>
}
Response: {
  updated_count: number
  errors?: Array<{ artifact_id: UUID, error: string }>
}
```

##### Calculation Requirements
- **Relevance Scoring**: `text_match_score * 0.6 + tag_match_score * 0.4`
- **Facet Counts**: Aggregate distinct tag values across filtered result set
- **Inherited Metadata**: Merge job metadata with artifact-specific metadata (artifact takes precedence)

##### Error Handling Requirements
- **Invalid Search Query**: Return 400 with query syntax error details
- **Metadata Schema Violation**: Reject with validation errors and allowed values
- **Bulk Update Partial Failures**: Return success count + individual error details
- **Tag Key Conflicts**: Use last-write-wins strategy with conflict logging

##### Accessibility Requirements
- Tag autocomplete with keyboard navigation (arrow keys, enter to select)
- Screen reader support for filter builder with ARIA live regions
- Keyboard shortcuts for common search operations (Ctrl+F for focus, Ctrl+S for save)
- High contrast mode for tag badges and filter chips

##### Performance Requirements
- Full-text search: <500ms response time for up to 100,000 artifacts
- Tag autocomplete: <100ms response time
- Metadata indexing: <1s after artifact creation or update
- Bulk metadata update: Process 500 artifacts per request within 5s

##### Analytics Requirements
```typescript
analytics.track('artifact_search', {
  query_type: 'full_text' | 'filtered' | 'combined',
  filter_count: number,
  result_count: number,
  search_duration_ms: number
})

analytics.track('metadata_updated', {
  artifact_count: number,
  update_type: 'bulk' | 'individual',
  tags_added: number,
  tags_removed: number
})
```

---

## 4.2 Checkpoint Management

### FR 4.2.1: Incremental Checkpoint Handling
**Description**: Implement intelligent checkpoint management supporting incremental saves, differential storage, and selective checkpoint retention based on performance metrics.

**Impact Weighting**: High (Critical for training efficiency and cost optimization)

**Priority**: P0 - Critical

**Dependencies**:
- FR 4.1.1 (Artifact Storage Structure)
- Training job monitoring (Part A: Section 1)
- Quality validation metrics (Part A: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\03-pipeline-functional-requirements.md`, Section 2)
- Cost management (Part A: Section 6)

**User Stories**: US4.2.1, US4.2.2

**Tasks**:
1. Implement checkpoint saving hooks in training pipeline
2. Create differential storage algorithm (store only weight deltas)
3. Implement checkpoint evaluation against quality thresholds
4. Add automatic checkpoint pruning based on performance
5. Create checkpoint restoration testing framework
6. Implement parallel checkpoint uploads to minimize training interruption
7. Add checkpoint comparison tools for weight analysis

**User Story Acceptance Criteria**:

#### US4.2.1: As a data scientist, I need automatic checkpoint saving at configurable intervals
- Given a training job configuration with checkpoint_interval=100 steps
- When training reaches step multiples (100, 200, 300, ...)
- Then checkpoint is automatically saved with minimal training interruption (<30s)
- And checkpoint includes: model weights, optimizer state, training metrics, step count
- And checkpoint validation occurs post-upload (hash verification)
- And I receive notification of successful checkpoint save

#### US4.2.2: As a system administrator, I need intelligent checkpoint retention to minimize storage costs
- Given completed training job with multiple checkpoints
- When quality evaluation completes for all checkpoints
- Then system retains: best checkpoint (highest quality score), final checkpoint, every 10th checkpoint
- And low-performing checkpoints are archived or deleted per policy
- And checkpoint retention decisions are logged with reasoning
- And I can configure custom retention rules per project

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Checkpoint tracking
CREATE TABLE training_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES training_artifacts(id) ON DELETE RESTRICT,
  checkpoint_step INTEGER NOT NULL,
  checkpoint_type VARCHAR(30) DEFAULT 'incremental' CHECK (checkpoint_type IN ('incremental', 'best', 'final', 'milestone')),
  is_differential BOOLEAN DEFAULT false,
  base_checkpoint_id UUID REFERENCES training_checkpoints(id),
  
  -- Quality metrics snapshot
  quality_score DECIMAL(5,2),
  perplexity_improvement DECIMAL(5,2),
  ei_benchmark_score DECIMAL(5,2),
  
  -- Training state
  training_loss DECIMAL(10,6),
  validation_loss DECIMAL(10,6),
  learning_rate DECIMAL(12,10),
  epoch DECIMAL(8,4),
  
  -- Checkpoint metadata
  save_duration_seconds INTEGER,
  upload_duration_seconds INTEGER,
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'corrupted', 'restored')),
  retention_priority INTEGER DEFAULT 0, -- Higher = more important to keep
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  
  UNIQUE(job_id, checkpoint_step)
);

CREATE INDEX idx_checkpoints_job_step ON training_checkpoints(job_id, checkpoint_step);
CREATE INDEX idx_checkpoints_type ON training_checkpoints(checkpoint_type);
CREATE INDEX idx_checkpoints_quality ON training_checkpoints(quality_score DESC) WHERE quality_score IS NOT NULL;
CREATE INDEX idx_checkpoints_retention ON training_checkpoints(job_id, retention_priority DESC);

-- Checkpoint retention policies
CREATE TABLE checkpoint_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  policy_name VARCHAR(100) NOT NULL,
  
  -- Retention rules
  keep_best_n INTEGER DEFAULT 1,
  keep_final BOOLEAN DEFAULT true,
  keep_every_nth INTEGER DEFAULT 10,
  keep_above_quality_threshold DECIMAL(5,2),
  
  -- Lifecycle rules
  archive_after_days INTEGER DEFAULT 90,
  delete_after_days INTEGER DEFAULT 180,
  
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### UI/UX Requirements
- Checkpoint timeline visualization with quality score overlay
- Checkpoint comparison tool (side-by-side weight diff visualization)
- Retention policy builder with visual rule preview
- Checkpoint restore interface with rollback confirmation
- Live checkpoint status during training (progress bar, ETA)
- Batch checkpoint operations (restore, archive, delete)

##### API Requirements
```typescript
// Checkpoint save endpoint (called from RunPod during training)
POST /api/checkpoints/save
Body: {
  job_id: UUID
  checkpoint_step: number
  checkpoint_type?: 'incremental' | 'best' | 'final' | 'milestone'
  training_metrics: {
    training_loss: number
    validation_loss: number
    learning_rate: number
    epoch: number
  }
  is_differential?: boolean
  base_checkpoint_step?: number
}
Response: {
  checkpoint_id: UUID
  upload_url: string // Presigned URL for artifact upload
  upload_expires_at: string
}

// Checkpoint query with quality filtering
GET /api/checkpoints?job_id={id}&min_quality={score}&type={type}
Response: {
  checkpoints: Array<{
    id: UUID
    checkpoint_step: number
    checkpoint_type: string
    quality_score: number | null
    training_loss: number
    validation_loss: number
    retention_priority: number
    created_at: string
  }>
  quality_progression: Array<{ step: number, score: number }>
}

// Checkpoint retention evaluation
POST /api/checkpoints/{job_id}/evaluate-retention
Response: {
  total_checkpoints: number
  to_keep: Array<{ checkpoint_id: UUID, reason: string }>
  to_archive: Array<{ checkpoint_id: UUID, reason: string }>
  to_delete: Array<{ checkpoint_id: UUID, reason: string }>
  estimated_storage_savings_gb: number
}

// Checkpoint restore
POST /api/checkpoints/{id}/restore
Body: {
  target_job_id?: UUID // If resuming in new job
  restore_optimizer_state: boolean
}
Response: {
  download_url: string
  checkpoint_metadata: Record<string, any>
  restoration_instructions: string
}
```

##### Calculation Requirements
- **Differential Checkpoint Size**: `current_weights - base_weights` (sparse matrix representation)
- **Retention Priority Score**: 
  ```
  priority = (quality_score * 40) + 
             (is_best ? 50 : 0) + 
             (is_final ? 30 : 0) + 
             (is_milestone ? 20 : 0) + 
             (every_10th ? 10 : 0)
  ```
- **Storage Savings**: `sum(archived_checkpoint_sizes) * (1 - compression_ratio)`
- **Checkpoint Interval Timing**: Balance between resume granularity and training interruption (default: every 100 steps or 30 minutes, whichever comes first)

##### Error Handling Requirements
- **Checkpoint Save Failure During Training**: Retry up to 3 times without halting training, log failure and continue
- **Corrupted Checkpoint Detection**: Validate hash on upload, mark as corrupted, notify user, attempt re-save from last valid checkpoint
- **Restoration Failure**: Verify checkpoint integrity before download, provide manual download option if automated restore fails
- **Retention Policy Conflicts**: Warn user of overlapping rules, apply most conservative retention (keep longest)
- **Differential Checkpoint Missing Base**: Fall back to full checkpoint save, log warning
- **Upload Timeout**: Extend presigned URL expiration if upload in progress, allow resume

##### Accessibility Requirements
- Checkpoint timeline navigable via keyboard (left/right arrows for steps)
- Screen reader announces checkpoint quality scores and status changes
- High contrast mode for quality score overlays on timeline
- Alternative table view for checkpoint list (accessible to screen readers)
- Keyboard shortcuts for checkpoint operations (R for restore, D for download)

##### Performance Requirements
- Checkpoint save: <30s interruption to training process
- Checkpoint upload: Parallel upload during training (non-blocking)
- Differential checkpoint generation: <15s for 7B parameter model
- Checkpoint validation: <5s for hash verification
- Retention evaluation: <10s for jobs with up to 500 checkpoints
- Checkpoint restoration: <2 minutes for full checkpoint download and validation

##### Analytics Requirements
```typescript
analytics.track('checkpoint_saved', {
  job_id: string,
  checkpoint_step: number,
  checkpoint_type: string,
  is_differential: boolean,
  save_duration_seconds: number,
  upload_duration_seconds: number,
  checkpoint_size_gb: number
})

analytics.track('checkpoint_retention_applied', {
  job_id: string,
  total_checkpoints: number,
  kept_count: number,
  archived_count: number,
  deleted_count: number,
  storage_savings_gb: number
})

analytics.track('checkpoint_restored', {
  checkpoint_id: string,
  job_id: string,
  checkpoint_step: number,
  restore_duration_seconds: number,
  restore_success: boolean
})
```

---

### FR 4.2.2: Checkpoint Quality Evaluation Integration
**Description**: Integrate quality validation metrics into checkpoint management to enable automatic identification of best-performing checkpoints and quality-based retention decisions.

**Impact Weighting**: Medium-High (Enables intelligent checkpoint selection)

**Priority**: P1 - High

**Dependencies**:
- FR 4.2.1 (Incremental Checkpoint Handling)
- Quality validation pipeline (Part A: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\03-pipeline-functional-requirements.md`, Section 2)
- Metrics calculation and storage

**User Stories**: US4.2.2

**Tasks**:
1. Create checkpoint quality evaluation job scheduler
2. Implement quality metric calculation for checkpoints
3. Add automatic "best checkpoint" designation based on composite score
4. Create quality trend analysis and anomaly detection
5. Implement quality-based early stopping recommendations
6. Add quality comparison reports across checkpoints

**User Story Acceptance Criteria**:

#### US4.2.2: Enhanced quality-based checkpoint management
- Given multiple checkpoints from a training job
- When quality evaluation completes for each checkpoint
- Then system automatically identifies best checkpoint based on composite quality score
- And checkpoint marked as "best" has retention_priority boosted
- And quality trend visualization shows progression across checkpoints
- And I receive recommendations for early stopping if quality plateaus or degrades

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Checkpoint quality evaluations
CREATE TABLE checkpoint_quality_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES training_checkpoints(id) ON DELETE CASCADE,
  
  -- Quality metrics (from Part A Section 2)
  perplexity_improvement DECIMAL(5,2),
  perplexity_baseline DECIMAL(10,4),
  perplexity_tuned DECIMAL(10,4),
  
  ei_benchmark_score DECIMAL(5,2),
  ei_empathy_score DECIMAL(5,2),
  ei_appropriateness_score DECIMAL(5,2),
  
  financial_knowledge_retention DECIMAL(5,2),
  brand_voice_consistency DECIMAL(5,2),
  
  -- Composite score
  composite_quality_score DECIMAL(5,2),
  quality_tier VARCHAR(20) CHECK (quality_tier IN ('excellent', 'good', 'acceptable', 'poor')),
  
  -- Evaluation metadata
  evaluation_duration_seconds INTEGER,
  evaluation_status VARCHAR(20) DEFAULT 'completed' CHECK (evaluation_status IN ('pending', 'running', 'completed', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_checkpoint_quality_checkpoint ON checkpoint_quality_evaluations(checkpoint_id);
CREATE INDEX idx_checkpoint_quality_score ON checkpoint_quality_evaluations(composite_quality_score DESC);
CREATE INDEX idx_checkpoint_quality_tier ON checkpoint_quality_evaluations(quality_tier);
```

##### UI/UX Requirements
- Quality metrics dashboard for checkpoint comparison
- Best checkpoint highlighting with badge indicator
- Quality trend chart with threshold lines (target metrics from Part A Section 2)
- Early stopping recommendation panel with reasoning
- Quality metric breakdown (drill-down from composite score)
- Checkpoint quality filter in artifact browser

##### API Requirements
```typescript
// Trigger checkpoint quality evaluation
POST /api/checkpoints/{id}/evaluate-quality
Body: {
  evaluation_priority?: 'high' | 'normal' | 'low'
  metrics_to_evaluate?: string[] // Subset of available metrics
}
Response: {
  evaluation_id: UUID
  estimated_duration_minutes: number
  queue_position: number
}

// Get quality evaluation results
GET /api/checkpoints/{id}/quality
Response: {
  checkpoint_id: UUID
  checkpoint_step: number
  quality_evaluation: {
    perplexity_improvement: number
    ei_benchmark_score: number
    financial_knowledge_retention: number
    brand_voice_consistency: number
    composite_quality_score: number
    quality_tier: string
  }
  is_best_checkpoint: boolean
  rank_in_job: number
  evaluated_at: string
}

// Get quality trend analysis
GET /api/jobs/{id}/quality-trend
Response: {
  checkpoints: Array<{
    step: number
    composite_quality_score: number
    quality_tier: string
  }>
  best_checkpoint_step: number
  quality_plateau_detected: boolean
  early_stopping_recommendation: {
    should_stop: boolean
    reason: string
    confidence: number
  }
  target_thresholds: {
    perplexity_improvement: number // ≥30%
    ei_benchmark_score: number // ≥40%
    financial_knowledge_retention: number // ≥95%
    brand_voice_consistency: number // ≥85%
  }
}
```

##### Calculation Requirements
- **Composite Quality Score**: 
  ```
  composite = (perplexity_improvement * 0.3) + 
              (ei_benchmark_score * 0.25) + 
              (financial_knowledge_retention * 0.25) + 
              (brand_voice_consistency * 0.2)
  
  // Normalize to 0-100 scale
  composite_normalized = (composite / max_possible_score) * 100
  ```
  
- **Quality Tier Assignment**:
  ```
  if composite_score >= 85: 'excellent'
  elif composite_score >= 70: 'good'
  elif composite_score >= 50: 'acceptable'
  else: 'poor'
  ```

- **Plateau Detection**: Quality improvement <5% over last 3 checkpoints

- **Best Checkpoint Selection**: Highest composite_quality_score with validation_loss as tiebreaker

##### Error Handling Requirements
- **Evaluation Failure**: Retry with reduced metric subset, mark partial evaluation if some metrics succeed
- **Missing Baseline Metrics**: Use job-level baseline from training configuration
- **Evaluation Timeout**: Cancel after 30 minutes, mark as failed, allow manual retry
- **Corrupted Checkpoint**: Skip evaluation, mark checkpoint as invalid
- **Concurrent Evaluation Requests**: Queue requests, process sequentially per checkpoint

##### Accessibility Requirements
- Quality trend chart with data table alternative
- Screen reader support for quality tier badges
- Keyboard navigation for checkpoint quality comparison
- High contrast mode for quality tier color coding
- ARIA live regions for evaluation progress updates

##### Performance Requirements
- Quality evaluation: <10 minutes per checkpoint (Llama 3 70B)
- Composite score calculation: <1s
- Quality trend analysis: <2s for jobs with up to 500 checkpoints
- Best checkpoint identification: <500ms query time
- Evaluation queue processing: Handle 20 concurrent evaluations

##### Analytics Requirements
```typescript
analytics.track('checkpoint_quality_evaluated', {
  checkpoint_id: string,
  job_id: string,
  checkpoint_step: number,
  composite_quality_score: number,
  quality_tier: string,
  evaluation_duration_seconds: number,
  is_best_checkpoint: boolean
})

analytics.track('early_stopping_recommended', {
  job_id: string,
  current_step: number,
  best_checkpoint_step: number,
  quality_plateau_detected: boolean,
  recommendation_confidence: number
})
```

---

## 4.3 Download & Access Management

### FR 4.3.1: Secure Artifact Download System
**Description**: Implement secure, high-performance download system for training artifacts with access control, download tracking, and resumable transfer support.

**Impact Weighting**: High (Critical for model delivery and collaboration)

**Priority**: P0 - Critical

**Dependencies**:
- FR 4.1.1 (Artifact Storage Structure)
- Authentication system (Section 11)
- Team collaboration permissions (Section 8)

**User Stories**: US4.3.1, US4.3.2

**Tasks**:
1. Implement presigned URL generation for secure downloads
2. Create download authorization middleware with permission checking
3. Add resumable download support (HTTP range requests)
4. Implement download quota enforcement per client/user
5. Create download link sharing with expiration and access limits
6. Add download activity logging and audit trail
7. Implement parallel download support for large files

**User Story Acceptance Criteria**:

#### US4.3.1: As a data scientist, I need secure download links that expire to protect model artifacts
- Given I have permission to access a training artifact
- When I request a download link
- Then I receive a presigned URL valid for 1 hour (configurable)
- And download link includes authentication token
- And link expires after specified time or download completion
- And download activity is logged with timestamp and user

#### US4.3.2: As a team lead, I need to track who downloads models for audit and compliance
- Given artifacts with download permissions configured
- When team members download artifacts
- Then all downloads are logged with user, timestamp, IP address, artifact details
- And I can view download history per artifact or per user
- And I can generate download audit reports
- And I receive alerts for unusual download patterns (bulk downloads, after-hours access)

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Download access control
CREATE TABLE artifact_download_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES training_artifacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  permission_type VARCHAR(20) DEFAULT 'download' CHECK (permission_type IN ('download', 'share', 'no_access')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL) OR (team_id IS NOT NULL))
);

CREATE INDEX idx_download_permissions_artifact ON artifact_download_permissions(artifact_id);
CREATE INDEX idx_download_permissions_user ON artifact_download_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_download_permissions_team ON artifact_download_permissions(team_id) WHERE team_id IS NOT NULL;

-- Download activity log
CREATE TABLE artifact_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES training_artifacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  download_url TEXT NOT NULL,
  download_method VARCHAR(20) DEFAULT 'presigned_url' CHECK (download_method IN ('presigned_url', 'api_stream', 'shared_link')),
  
  -- Download tracking
  download_started_at TIMESTAMPTZ DEFAULT NOW(),
  download_completed_at TIMESTAMPTZ,
  download_interrupted_at TIMESTAMPTZ,
  bytes_transferred BIGINT DEFAULT 0,
  download_status VARCHAR(20) DEFAULT 'initiated' CHECK (download_status IN ('initiated', 'in_progress', 'completed', 'failed', 'interrupted')),
  
  -- Audit metadata
  ip_address INET,
  user_agent TEXT,
  shared_link_id UUID REFERENCES shared_artifact_links(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_downloads_artifact ON artifact_downloads(artifact_id);
CREATE INDEX idx_downloads_user ON artifact_downloads(user_id);
CREATE INDEX idx_downloads_status ON artifact_downloads(download_status, download_started_at);
CREATE INDEX idx_downloads_completed ON artifact_downloads(download_completed_at) WHERE download_completed_at IS NOT NULL;

-- Shared download links
CREATE TABLE shared_artifact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES training_artifacts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Link configuration
  link_token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_downloads INTEGER DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  requires_authentication BOOLEAN DEFAULT false,
  
  -- Access restrictions
  allowed_ip_ranges INET[],
  allowed_email_domains TEXT[],
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_shared_links_token ON shared_artifact_links(link_token) WHERE is_active = true;
CREATE INDEX idx_shared_links_artifact ON shared_artifact_links(artifact_id);
CREATE INDEX idx_shared_links_expiry ON shared_artifact_links(expires_at) WHERE is_active = true;

-- Download quotas
CREATE TABLE download_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  user_id UUID REFERENCES auth.users(id),
  quota_period VARCHAR(20) DEFAULT 'monthly' CHECK (quota_period IN ('daily', 'weekly', 'monthly')),
  quota_bytes BIGINT NOT NULL,
  used_bytes BIGINT DEFAULT 0,
  quota_reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((client_id IS NOT NULL) OR (user_id IS NOT NULL))
);

CREATE INDEX idx_quotas_client ON download_quotas(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_quotas_user ON download_quotas(user_id) WHERE user_id IS NOT NULL;
```

##### UI/UX Requirements
- Download button with permission indicator (enabled/disabled)
- Download progress modal with speed, ETA, and pause/resume controls
- Share dialog with expiration settings, download limits, and link generation
- Download history panel with filterable table (user, artifact, date, status)
- Quota usage meter showing monthly download limits
- Audit report generator with date range and export options

##### API Requirements
```typescript
// Request download URL
POST /api/artifacts/{id}/download-url
Body: {
  expiration_minutes?: number // Default: 60
  download_method?: 'presigned_url' | 'api_stream'
}
Response: {
  download_url: string
  expires_at: string
  artifact_size_bytes: number
  supports_resume: boolean
  download_id: UUID
}

// Create shared download link
POST /api/artifacts/{id}/share
Body: {
  expiration_hours: number // 1-168 (1 week max)
  max_downloads?: number // Default: 1
  requires_authentication?: boolean
  allowed_email_domains?: string[]
  message?: string
}
Response: {
  shared_link_id: UUID
  link_url: string
  link_token: string
  expires_at: string
  max_downloads: number
}

// Access shared link
GET /api/shared-downloads/{token}
Response: {
  artifact_id: UUID
  artifact_name: string
  artifact_size_bytes: number
  created_by: string // User name
  message: string
  downloads_remaining: number
  expires_at: string
  download_url: string
}

// Get download history
GET /api/artifacts/download-history?artifact_id={id}&user_id={id}&from={date}&to={date}
Response: {
  downloads: Array<{
    id: UUID
    artifact_id: UUID
    artifact_name: string
    user_id: UUID
    user_name: string
    download_started_at: string
    download_completed_at: string | null
    download_status: string
    bytes_transferred: number
    ip_address: string
  }>
  total_count: number
  total_bytes_transferred: number
}

// Check download quota
GET /api/download-quota
Response: {
  quota_period: string
  quota_bytes: number
  used_bytes: number
  remaining_bytes: number
  quota_reset_at: string
  utilization_percent: number
}
```

##### Calculation Requirements
- **Presigned URL Expiration**: `current_time + expiration_minutes * 60`
- **Download Quota Utilization**: `(used_bytes / quota_bytes) * 100`
- **Quota Reset Time**: 
  ```
  if quota_period == 'daily': reset_at = start_of_next_day
  elif quota_period == 'weekly': reset_at = start_of_next_week
  elif quota_period == 'monthly': reset_at = start_of_next_month
  ```
- **Downloads Remaining**: `max(0, max_downloads - download_count)`
- **Transfer Speed**: `bytes_transferred / (current_time - download_started_at).seconds`

##### Error Handling Requirements
- **Quota Exceeded**: Return 429 with quota reset time and overage amount
- **Expired Link**: Return 410 with link expiration time
- **Permission Denied**: Return 403 with required permission details
- **Download Interrupted**: Support HTTP range requests for resume (Accept-Ranges: bytes)
- **Concurrent Downloads**: Allow up to 3 simultaneous downloads per user
- **Invalid Shared Link Token**: Return 404 (don't reveal if token ever existed)
- **IP Restriction Violation**: Return 403 with generic error (don't reveal IP restrictions)

##### Accessibility Requirements
- Download progress announced to screen readers
- Keyboard shortcuts for download actions (D for download, S for share)
- High contrast mode for quota usage meters
- Alternative text for download status icons
- Focus management for download modals (trap focus, return on close)

##### Performance Requirements
- Presigned URL generation: <200ms
- Download initiation: <1s to first byte
- Transfer speed: ≥100 MB/s on H100 PCIe connection
- Shared link creation: <300ms
- Download history query: <500ms for up to 10,000 records
- Quota check: <100ms
- Support resumable downloads for files >1GB

##### Analytics Requirements
```typescript
analytics.track('artifact_download_initiated', {
  artifact_id: string,
  artifact_type: string,
  file_size_bytes: number,
  download_method: string,
  via_shared_link: boolean
})

analytics.track('artifact_download_completed', {
  download_id: string,
  artifact_id: string,
  file_size_bytes: number,
  download_duration_seconds: number,
  average_speed_mbps: number
})

analytics.track('shared_link_created', {
  artifact_id: string,
  expiration_hours: number,
  max_downloads: number,
  requires_authentication: boolean
})

analytics.track('download_quota_exceeded', {
  user_id: string,
  client_id: string,
  quota_period: string,
  overage_bytes: number
})

analytics.track('unusual_download_pattern_detected', {
  user_id: string,
  pattern_type: 'bulk_download' | 'after_hours' | 'rapid_succession',
  download_count: number,
  time_window_minutes: number
})
```

---

### FR 4.3.2: Artifact Access Permissions System
**Description**: Implement granular permission system for artifact access control integrated with team roles and project memberships.

**Impact Weighting**: Medium-High (Essential for multi-tenant collaboration)

**Priority**: P1 - High

**Dependencies**:
- FR 4.3.1 (Secure Artifact Download System)
- Team collaboration framework (Section 8)
- Authentication & authorization (Section 11)

**User Stories**: US4.3.2

**Tasks**:
1. Define artifact permission model (read, download, share, delete)
2. Implement role-based access control (RBAC) for artifacts
3. Create permission inheritance from job/project/client
4. Add permission delegation and temporary access grants
5. Implement permission audit logging
6. Create permission management UI for team leads

**User Story Acceptance Criteria**:

#### US4.3.2: Enhanced artifact permission management
- Given I am a team lead managing project artifacts
- When I configure artifact permissions
- Then I can assign permissions at artifact, job, or project level
- And permissions inherit hierarchically (project → job → artifact)
- And I can grant temporary access with expiration
- And permission changes are logged with audit trail
- And users see only artifacts they have permission to access

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Permission inheritance hierarchy
CREATE TABLE artifact_permission_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(100) NOT NULL,
  scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('artifact', 'job', 'project', 'client')),
  scope_id UUID NOT NULL,
  
  -- Default permissions for new artifacts in scope
  default_read BOOLEAN DEFAULT true,
  default_download BOOLEAN DEFAULT false,
  default_share BOOLEAN DEFAULT false,
  default_delete BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(scope_type, scope_id)
);

-- Role-based artifact permissions
CREATE TABLE artifact_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES training_artifacts(id) ON DELETE CASCADE,
  role_name VARCHAR(50) NOT NULL CHECK (role_name IN ('owner', 'admin', 'member', 'viewer', 'guest')),
  
  can_read BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_manage_permissions BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_role_permissions_artifact ON artifact_role_permissions(artifact_id);

-- Permission audit log
CREATE TABLE artifact_permission_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES training_artifacts(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_type VARCHAR(30) NOT NULL CHECK (change_type IN ('granted', 'revoked', 'modified', 'inherited')),
  
  -- Permission details
  target_user_id UUID REFERENCES auth.users(id),
  target_team_id UUID REFERENCES teams(id),
  permission_before JSONB,
  permission_after JSONB,
  
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permission_changes_artifact ON artifact_permission_changes(artifact_id);
CREATE INDEX idx_permission_changes_user ON artifact_permission_changes(target_user_id) WHERE target_user_id IS NOT NULL;
```

##### UI/UX Requirements
- Permission management panel with role-based access matrix
- Permission inheritance visualization (tree view showing scope hierarchy)
- Bulk permission update for multiple artifacts
- Permission audit log viewer with filtering and export
- Permission conflict resolver (when inherited and explicit permissions differ)
- User-friendly permission picker (checkboxes for read/download/share/delete)

##### API Requirements
```typescript
// Get effective permissions for artifact
GET /api/artifacts/{id}/permissions
Response: {
  artifact_id: UUID
  user_permissions: {
    can_read: boolean
    can_download: boolean
    can_share: boolean
    can_delete: boolean
    can_manage_permissions: boolean
    permission_source: 'explicit' | 'role' | 'inherited_job' | 'inherited_project'
  }
  inherited_from: {
    job_id?: UUID
    project_id?: UUID
    client_id?: UUID
  }
}

// Update artifact permissions
PUT /api/artifacts/{id}/permissions
Body: {
  user_id?: UUID
  team_id?: UUID
  permissions: {
    can_read?: boolean
    can_download?: boolean
    can_share?: boolean
    can_delete?: boolean
  }
  expires_at?: string
  reason?: string
}
Response: {
  permission_id: UUID
  effective_permissions: UserPermissions
}

// Get permission audit log
GET /api/artifacts/{id}/permission-history
Response: {
  changes: Array<{
    id: UUID
    changed_by: string // User name
    change_type: string
    target_user: string
    permission_before: Record<string, boolean>
    permission_after: Record<string, boolean>
    reason: string
    created_at: string
  }>
  total_count: number
}
```

##### Calculation Requirements
- **Effective Permissions**: Resolve hierarchy (explicit > role > job-inherited > project-inherited > client-inherited)
- **Permission Conflicts**: When multiple roles apply, use most permissive (logical OR of permissions)
- **Inheritance Propagation**: Changes to project permissions affect all jobs/artifacts within

##### Error Handling Requirements
- **Permission Denied for Management**: Return 403 with required permission (can_manage_permissions)
- **Conflicting Permissions**: Warn user, apply most permissive, log conflict
- **Circular Inheritance**: Detect and reject, return 400 with cycle description
- **Expired Temporary Access**: Automatically revoke, send notification to user

##### Accessibility Requirements
- Permission matrix keyboard navigable (arrow keys, space to toggle)
- Screen reader support for permission changes (announce before/after state)
- High contrast mode for permission status indicators
- Alternative list view for permission matrix (screen reader friendly)

##### Performance Requirements
- Permission check: <50ms query time
- Bulk permission update: Process 100 artifacts per second
- Permission audit log query: <500ms for up to 10,000 records
- Effective permission calculation: <100ms with 5-level hierarchy

##### Analytics Requirements
```typescript
analytics.track('artifact_permission_changed', {
  artifact_id: string,
  changed_by: string,
  change_type: string,
  target_user_id: string,
  permissions_granted: string[],
  permissions_revoked: string[]
})

analytics.track('permission_conflict_detected', {
  artifact_id: string,
  conflict_type: 'role_vs_explicit' | 'multiple_roles' | 'inherited_vs_explicit',
  resolution: string
})
```

---

# 5. Training Comparison & Optimization

## 5.1 Training Run Comparison

### FR 5.1.1: Multi-Run Comparison Dashboard
**Description**: Implement comprehensive comparison dashboard enabling side-by-side analysis of multiple training runs across hyperparameters, metrics, costs, and quality outcomes.

**Impact Weighting**: Medium (Enhances optimization workflow)

**Priority**: P1 - High

**Dependencies**:
- Training job data (Part A: Section 1)
- Quality metrics (Part A: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\03-pipeline-functional-requirements.md`, Section 2)
- Cost data (Part A: Section 6)
- Checkpoint quality data (FR 4.2.2)

**User Stories**: US5.1.1, US5.1.2

**Tasks**:
1. Create comparison data model supporting flexible metric selection
2. Implement side-by-side comparison UI with synchronized scrolling
3. Add hyperparameter difference highlighting
4. Create metric visualization with overlaid trend lines
5. Implement statistical significance testing for metric differences
6. Add export functionality for comparison reports
7. Create comparison templates for common analysis patterns

**User Story Acceptance Criteria**:

#### US5.1.1: As a data scientist, I need to compare training runs side-by-side to identify optimal configurations
- Given multiple completed training runs
- When I select 2-5 runs for comparison
- Then I see side-by-side view of: hyperparameters, final metrics, cost breakdown, quality scores
- And differences are highlighted (green for improvements, red for regressions)
- And I can filter metrics displayed (show only changed parameters)
- And I can save comparison as template for future reference

#### US5.1.2: As a ML engineer, I need statistical analysis of metric differences to determine significance
- Given comparison of 2+ training runs
- When viewing metric differences
- Then system calculates statistical significance (p-values for key metrics)
- And confidence intervals are displayed for metrics with variance
- And I see recommendations for which run is objectively better
- And I can export comparison report with statistical analysis

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Comparison sessions (saved comparisons)
CREATE TABLE training_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_name VARCHAR(200) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Comparison configuration
  job_ids UUID[] NOT NULL,
  selected_metrics TEXT[],
  comparison_type VARCHAR(30) DEFAULT 'side_by_side' CHECK (comparison_type IN ('side_by_side', 'overlay', 'difference')),
  
  -- Saved analysis
  analysis_results JSONB,
  notes TEXT,
  
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comparisons_created_by ON training_comparisons(created_by);
CREATE INDEX idx_comparisons_jobs ON training_comparisons USING GIN(job_ids);

-- Comparison metric snapshots (for historical comparison even if job data changes)
CREATE TABLE comparison_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES training_comparisons(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES training_jobs(id),
  
  -- Hyperparameters snapshot
  hyperparameters JSONB NOT NULL,
  
  -- Metrics snapshot
  final_loss DECIMAL(10,6),
  best_validation_loss DECIMAL(10,6),
  training_duration_hours DECIMAL(8,2),
  total_cost_usd DECIMAL(10,2),
  
  -- Quality metrics
  composite_quality_score DECIMAL(5,2),
  perplexity_improvement DECIMAL(5,2),
  ei_benchmark_score DECIMAL(5,2),
  
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metric_snapshots_comparison ON comparison_metric_snapshots(comparison_id);
```

##### UI/UX Requirements
- Job selection panel with multi-select and search
- Side-by-side comparison table with sticky headers
- Metric difference highlighting (color-coded: green=better, red=worse, gray=neutral)
- Hyperparameter diff viewer showing only changed values
- Metric trend overlay chart with job selector
- Statistical significance indicators (★ for p<0.05, ★★ for p<0.01)
- Comparison export button (PDF, CSV, Markdown)
- Template save dialog with name and description

##### API Requirements
```typescript
// Create comparison session
POST /api/training/comparisons
Body: {
  comparison_name: string
  job_ids: UUID[] // 2-5 jobs
  selected_metrics?: string[]
  comparison_type?: 'side_by_side' | 'overlay' | 'difference'
}
Response: {
  comparison_id: UUID
  comparison_data: {
    jobs: Array<{
      job_id: UUID
      job_name: string
      hyperparameters: Record<string, any>
      final_metrics: Record<string, number>
      quality_metrics: Record<string, number>
      cost_metrics: {
        total_cost_usd: number
        cost_per_hour: number
        gpu_type: string
      }
    }>
    differences: Record<string, {
      values: number[]
      range: [number, number]
      std_dev: number
      best_job_id: UUID
    }>
    statistical_analysis: Record<string, {
      anova_p_value: number
      is_significant: boolean
      confidence_intervals: Array<[number, number]>
    }>
  }
}

// Get comparison templates
GET /api/training/comparison-templates
Response: {
  templates: Array<{
    id: UUID
    comparison_name: string
    selected_metrics: string[]
    comparison_type: string
    created_by: string
    usage_count: number
  }>
}

// Export comparison
POST /api/training/comparisons/{id}/export
Body: {
  format: 'pdf' | 'csv' | 'markdown' | 'json'
  include_charts: boolean
}
Response: {
  export_url: string
  expires_at: string
}
```

##### Calculation Requirements
- **Metric Difference**: `(new_value - baseline_value) / baseline_value * 100` (percentage change)
- **Better/Worse Determination**: 
  - For loss metrics: lower is better
  - For quality/accuracy metrics: higher is better
  - For cost metrics: lower is better (unless optimizing for speed)
- **Statistical Significance (ANOVA)**: 
  ```
  For metric M across jobs J1, J2, ..., Jn:
  - Calculate between-group variance and within-group variance
  - F-statistic = between_variance / within_variance
  - p-value from F-distribution
  - Significant if p < 0.05
  ```
- **Confidence Intervals**: `mean ± (1.96 * std_dev / sqrt(n))` (95% CI)
- **Best Job Recommendation Score**:
  ```
  score = (quality_score * 0.5) + 
          (cost_efficiency * 0.3) + 
          (training_speed * 0.2)
  ```

##### Error Handling Requirements
- **Too Many Jobs Selected**: Limit to 5 jobs, return 400 with message
- **Incompatible Jobs**: Warn if comparing jobs with different base models or dataset sizes
- **Missing Metrics**: Display "N/A" for jobs without specific metrics
- **Statistical Calculation Failure**: Fallback to simple mean comparison, log warning

##### Accessibility Requirements
- Comparison table keyboard navigable with arrow keys
- Screen reader support for metric differences (announce "X improved by Y%")
- High contrast mode for difference highlighting
- Alternative text for statistical significance indicators
- Exportable text-based comparison report

##### Performance Requirements
- Comparison data loading: <2s for up to 5 jobs with full metrics
- Statistical calculations: <1s for up to 10 metrics
- Chart rendering: <500ms for overlay of 5 trend lines
- Export generation: <5s for PDF with charts
- Template save: <300ms

##### Analytics Requirements
```typescript
analytics.track('training_comparison_created', {
  comparison_id: string,
  job_count: number,
  metric_count: number,
  comparison_type: string
})

analytics.track('comparison_exported', {
  comparison_id: string,
  export_format: string,
  include_charts: boolean
})

analytics.track('comparison_template_saved', {
  template_id: string,
  selected_metrics: string[]
})
```

---

### FR 5.1.2: Hyperparameter Impact Analysis
**Description**: Implement analysis tools to identify relationships between hyperparameter changes and training outcomes, enabling data-driven optimization.

**Impact Weighting**: Medium (Supports optimization decisions)

**Priority**: P2 - Medium

**Dependencies**:
- FR 5.1.1 (Multi-Run Comparison Dashboard)
- Training job hyperparameter tracking
- Quality metrics

**User Stories**: US5.1.1

**Tasks**:
1. Create hyperparameter sensitivity analysis algorithm
2. Implement correlation calculation between parameters and metrics
3. Add visualization of parameter impact (tornado charts, scatter plots)
4. Create automated hyperparameter recommendation engine
5. Implement parameter sweep result analysis
6. Add "what-if" scenario simulator

**User Story Acceptance Criteria**:

#### US5.1.1: Enhanced hyperparameter optimization
- Given historical training runs with varied hyperparameters
- When I request hyperparameter impact analysis
- Then system identifies which parameters most influence quality metrics
- And I see correlation coefficients for each parameter-metric pair
- And I receive recommendations for next parameter values to try
- And I can simulate expected outcomes for proposed hyperparameter changes

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Hyperparameter analysis results
CREATE TABLE hyperparameter_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_name VARCHAR(200) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Analysis scope
  job_ids UUID[] NOT NULL,
  analyzed_parameters TEXT[] NOT NULL,
  target_metrics TEXT[] NOT NULL,
  
  -- Results
  correlations JSONB, -- {"learning_rate": {"final_loss": -0.85, "quality_score": 0.72}}
  parameter_importance JSONB, -- Ranked list of parameters by impact
  recommendations JSONB, -- Suggested parameter values
  
  analysis_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hp_analyses_created_by ON hyperparameter_analyses(created_by);
```

##### UI/UX Requirements
- Hyperparameter impact dashboard with sortable table
- Correlation matrix heatmap (parameters vs. metrics)
- Tornado chart showing parameter sensitivity
- Scatter plot with parameter on X-axis, metric on Y-axis, trend line overlay
- Recommendation panel with suggested parameter ranges
- "What-if" simulator with sliders for parameter adjustment

##### API Requirements
```typescript
// Run hyperparameter impact analysis
POST /api/training/analyze-hyperparameters
Body: {
  job_ids: UUID[]
  analyzed_parameters?: string[] // Default: all variable parameters
  target_metrics: string[] // e.g., ["final_loss", "quality_score"]
}
Response: {
  analysis_id: UUID
  correlations: Record<string, Record<string, number>> // param -> metric -> correlation
  parameter_importance: Array<{
    parameter: string
    importance_score: number // 0-1
    impact_summary: string
  }>
  recommendations: Array<{
    parameter: string
    current_range: [number, number]
    suggested_range: [number, number]
    expected_improvement: number
    confidence: number
  }>
}

// Simulate hyperparameter changes
POST /api/training/simulate-hyperparameters
Body: {
  base_job_id: UUID
  parameter_changes: Record<string, number>
}
Response: {
  predicted_metrics: Record<string, {
    value: number
    confidence_interval: [number, number]
    change_from_base: number
  }>
  prediction_confidence: number
  recommendation: string
}
```

##### Calculation Requirements
- **Pearson Correlation Coefficient**:
  ```
  r = Σ((xi - x_mean)(yi - y_mean)) / sqrt(Σ(xi - x_mean)² * Σ(yi - y_mean)²)
  ```
  Where xi = parameter values, yi = metric values
  
- **Parameter Importance Score**:
  ```
  importance = abs(correlation) * (1 - p_value) * metric_weight
  ```
  Normalize to 0-1 scale
  
- **Prediction Model**: Linear regression or polynomial regression fitted to historical data
  ```
  predicted_metric = β0 + β1*param1 + β2*param2 + ... + noise
  ```

- **Confidence Interval**: Based on regression model's residual standard error

##### Error Handling Requirements
- **Insufficient Data**: Require minimum 5 jobs for analysis, return 400 if fewer
- **No Parameter Variance**: Warn if parameter has same value across all jobs
- **Prediction Model Failure**: Fall back to simple averaging, indicate low confidence
- **Outlier Detection**: Flag jobs with metric values >3 std deviations from mean

##### Accessibility Requirements
- Correlation heatmap with alternative data table view
- Screen reader support for recommendations
- Keyboard-navigable what-if simulator (arrow keys, number input)
- High contrast mode for heatmap color scales

##### Performance Requirements
- Correlation calculation: <2s for 20 parameters × 10 metrics × 50 jobs
- Prediction model fitting: <3s
- What-if simulation: <500ms per scenario
- Visualization rendering: <1s for complex charts

##### Analytics Requirements
```typescript
analytics.track('hyperparameter_analysis_run', {
  analysis_id: string,
  job_count: number,
  parameter_count: number,
  analysis_duration_seconds: number
})

analytics.track('hyperparameter_recommendation_applied', {
  parameter: string,
  old_value: number,
  new_value: number,
  expected_improvement: number
})

analytics.track('what_if_simulation_run', {
  base_job_id: string,
  parameters_changed: number,
  prediction_confidence: number
})
```

---

## 5.2 Optimization Insights

### FR 5.2.1: Cost-Quality Trade-off Analysis
**Description**: Implement analysis tools to visualize and optimize the trade-off between training costs and quality outcomes, enabling budget-conscious decision making.

**Impact Weighting**: Medium (Supports cost optimization)

**Priority**: P2 - Medium

**Dependencies**:
- Cost tracking (Part A: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\03-pipeline-functional-requirements.md`, Section 6)
- Quality metrics (Part A: Section 2)
- FR 5.1.1 (Multi-Run Comparison)

**User Stories**: US5.2.1

**Tasks**:
1. Create cost-quality scatter plot visualization
2. Implement Pareto frontier calculation for optimal configurations
3. Add cost efficiency metric (quality per dollar)
4. Create budget allocation recommendations
5. Implement ROI calculator for quality improvements
6. Add "sweet spot" identification for cost-quality balance

**User Story Acceptance Criteria**:

#### US5.2.1: As a project manager, I need cost-quality trade-off analysis to make budget decisions
- Given multiple training runs with cost and quality data
- When I view cost-quality analysis
- Then I see scatter plot with cost on X-axis, quality on Y-axis
- And Pareto frontier highlights optimal configurations (best quality for given cost)
- And I see cost efficiency metric for each run (quality points per dollar)
- And I receive recommendations for "sweet spot" configurations
- And I can set budget constraint and see achievable quality range

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Pre-computed cost-quality analysis (for performance)
CREATE TABLE cost_quality_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  
  -- Analysis scope
  analyzed_job_ids UUID[] NOT NULL,
  analysis_period_start TIMESTAMPTZ NOT NULL,
  analysis_period_end TIMESTAMPTZ NOT NULL,
  
  -- Results
  pareto_frontier_job_ids UUID[], -- Jobs on optimal frontier
  cost_efficiency_rankings JSONB, -- {"job_id": cost_efficiency_score}
  sweet_spot_job_id UUID REFERENCES training_jobs(id),
  
  -- Recommendations
  recommended_budget DECIMAL(10,2),
  expected_quality_at_budget DECIMAL(5,2),
  roi_analysis JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_quality_client ON cost_quality_analyses(client_id);
CREATE INDEX idx_cost_quality_project ON cost_quality_analyses(project_id);
```

##### UI/UX Requirements
- Cost-quality scatter plot with interactive tooltips
- Pareto frontier line overlay (dashed line connecting optimal points)
- Job selection highlights corresponding point on chart
- Cost efficiency table with sortable columns
- Budget slider with dynamic quality range indicator
- ROI calculator with expected improvement inputs
- Sweet spot recommendation card with justification

##### API Requirements
```typescript
// Get cost-quality analysis
GET /api/training/cost-quality-analysis?project_id={id}&from={date}&to={date}
Response: {
  analysis_id: UUID
  data_points: Array<{
    job_id: UUID
    job_name: string
    total_cost_usd: number
    composite_quality_score: number
    cost_efficiency: number // quality_score / cost
    is_pareto_optimal: boolean
  }>
  pareto_frontier: Array<{
    job_id: UUID
    cost_usd: number
    quality_score: number
  }>
  sweet_spot: {
    job_id: UUID
    job_name: string
    cost_usd: number
    quality_score: number
    justification: string
  }
  recommendations: {
    budget_for_target_quality: Record<number, number> // quality -> cost
    achievable_quality_at_budget: Record<number, number> // budget -> quality
  }
}

// Calculate ROI for quality improvement
POST /api/training/calculate-roi
Body: {
  baseline_job_id: UUID
  target_quality_improvement: number // e.g., 10% improvement
  budget_constraint?: number
}
Response: {
  estimated_cost: number
  expected_quality_score: number
  roi_percent: number
  confidence: number
  recommended_hyperparameters: Record<string, any>
}
```

##### Calculation Requirements
- **Cost Efficiency**: `composite_quality_score / total_cost_usd`
- **Pareto Frontier**: 
  ```
  job J is Pareto optimal if no other job J' exists where:
    cost(J') <= cost(J) AND quality(J') >= quality(J) with at least one strict inequality
  ```
- **Sweet Spot**:
  ```
  sweet_spot = argmax(quality_score / log(cost + 1))
  ```
  Balances quality gain with logarithmic cost sensitivity
  
- **ROI**: 
  ```
  ROI = (quality_improvement * business_value_per_quality_point - additional_cost) / additional_cost * 100
  ```
  
- **Budget Prediction**: Linear interpolation between Pareto frontier points

##### Error Handling Requirements
- **Insufficient Data**: Require minimum 3 jobs for meaningful analysis
- **All Costs Same**: Warn user, show quality-only ranking
- **All Quality Scores Same**: Warn user, show cost-only ranking
- **Budget Below Minimum**: Return lowest-cost Pareto point with warning

##### Accessibility Requirements
- Scatter plot with alternative data table view
- Screen reader announces Pareto optimal points
- Keyboard navigation for point selection (arrow keys)
- High contrast mode for Pareto frontier line

##### Performance Requirements
- Analysis calculation: <3s for up to 100 jobs
- Pareto frontier computation: <1s for up to 100 jobs
- Chart rendering: <500ms
- ROI calculation: <200ms

##### Analytics Requirements
```typescript
analytics.track('cost_quality_analysis_viewed', {
  project_id: string,
  job_count: number,
  pareto_optimal_count: number,
  sweet_spot_identified: boolean
})

analytics.track('roi_calculated', {
  baseline_job_id: string,
  target_quality_improvement: number,
  estimated_roi_percent: number
})
```

---

### FR 5.2.2: Automated Optimization Recommendations
**Description**: Implement AI-driven recommendation engine that analyzes training history and suggests optimal configurations for new training runs.

**Impact Weighting**: Medium (Enhances user productivity)

**Priority**: P2 - Medium

**Dependencies**:
- FR 5.1.2 (Hyperparameter Impact Analysis)
- FR 5.2.1 (Cost-Quality Trade-off Analysis)
- Historical training data

**User Stories**: US5.2.2

**Tasks**:
1. Create recommendation engine with machine learning model
2. Implement configuration suggestion based on project goals
3. Add explanation generation for recommendations
4. Create recommendation confidence scoring
5. Implement feedback loop for recommendation improvement
6. Add A/B testing framework for recommendations

**User Story Acceptance Criteria**:

#### US5.2.2: As a data scientist, I need automated recommendations for training configurations
- Given I'm starting a new training run
- When I request recommendations
- Then system suggests optimal hyperparameters based on project history
- And recommendations are tailored to my stated goal (cost, quality, speed)
- And I see confidence scores and explanations for each recommendation
- And I can provide feedback on recommendation quality
- And system learns from my feedback to improve future recommendations

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Recommendation history
CREATE TABLE training_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  
  -- Input context
  optimization_goal VARCHAR(20) NOT NULL CHECK (optimization_goal IN ('quality', 'cost', 'speed', 'balanced')),
  budget_constraint DECIMAL(10,2),
  time_constraint_hours INTEGER,
  
  -- Recommendations
  recommended_hyperparameters JSONB NOT NULL,
  recommended_gpu_type VARCHAR(50),
  recommended_spot_strategy VARCHAR(20),
  
  -- Metadata
  confidence_score DECIMAL(5,2),
  explanation TEXT,
  based_on_job_ids UUID[],
  
  -- Feedback
  was_applied BOOLEAN DEFAULT false,
  resulting_job_id UUID REFERENCES training_jobs(id),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_created_by ON training_recommendations(created_by);
CREATE INDEX idx_recommendations_project ON training_recommendations(project_id);
CREATE INDEX idx_recommendations_rating ON training_recommendations(user_rating) WHERE user_rating IS NOT NULL;
```

##### UI/UX Requirements
- Recommendation request form with goal selection and constraints
- Recommendation card with hyperparameters, confidence, and explanation
- "Apply recommendation" button to pre-fill training form
- Feedback dialog with rating and comments
- Recommendation history panel showing past suggestions
- A/B test results dashboard for recommendation performance

##### API Requirements
```typescript
// Get training recommendations
POST /api/training/recommendations
Body: {
  project_id?: UUID
  optimization_goal: 'quality' | 'cost' | 'speed' | 'balanced'
  budget_constraint?: number
  time_constraint_hours?: number
  dataset_characteristics?: {
    size_gb: number
    sample_count: number
  }
}
Response: {
  recommendation_id: UUID
  recommended_hyperparameters: {
    learning_rate: number
    batch_size: number
    num_epochs: number
    lora_rank: number
    lora_alpha: number
    // ... other hyperparameters
  }
  recommended_gpu_type: string
  recommended_spot_strategy: 'spot_only' | 'on_demand_only' | 'spot_with_fallback'
  confidence_score: number // 0-100
  explanation: string
  estimated_outcomes: {
    expected_quality_score: number
    expected_cost_usd: number
    expected_duration_hours: number
  }
  alternative_recommendations?: Array<{
    hyperparameters: Record<string, any>
    trade_off: string
    confidence_score: number
  }>
}

// Submit recommendation feedback
POST /api/training/recommendations/{id}/feedback
Body: {
  rating: number // 1-5
  was_applied: boolean
  resulting_job_id?: UUID
  feedback_text?: string
}
Response: {
  success: boolean
  thank_you_message: string
}
```

##### Calculation Requirements
- **Confidence Score**:
  ```
  confidence = (historical_data_quality * 0.4) + 
               (model_prediction_accuracy * 0.3) + 
               (similarity_to_past_successful_runs * 0.3)
  ```
  Scale to 0-100

- **Recommendation Model**: Gradient boosting regression trained on historical jobs
  - Features: dataset characteristics, past hyperparameters, project metadata
  - Target: composite quality score, cost, duration
  - Re-train monthly with new data

- **Similarity Score**: Cosine similarity between new run context and historical jobs

##### Error Handling Requirements
- **No Historical Data**: Return baseline recommendations from industry best practices
- **Model Prediction Failure**: Fall back to rule-based recommendations
- **Conflicting Goals**: Warn user (e.g., "maximize quality + minimize cost may be impossible")
- **Out-of-bounds Recommendations**: Clip to valid ranges, note limitation

##### Accessibility Requirements
- Recommendation cards keyboard navigable
- Screen reader support for confidence scores and explanations
- Alternative text-based recommendation format
- Keyboard shortcuts for apply recommendation (A) and provide feedback (F)

##### Performance Requirements
- Recommendation generation: <3s
- Model inference: <500ms
- Feedback submission: <200ms
- Alternative recommendations: <5s for top 3 alternatives

##### Analytics Requirements
```typescript
analytics.track('recommendation_requested', {
  project_id: string,
  optimization_goal: string,
  budget_constraint: number,
  confidence_score: number
})

analytics.track('recommendation_applied', {
  recommendation_id: string,
  resulting_job_id: string
})

analytics.track('recommendation_feedback_submitted', {
  recommendation_id: string,
  rating: number,
  was_applied: boolean
})

analytics.track('recommendation_accuracy', {
  recommendation_id: string,
  predicted_quality: number,
  actual_quality: number,
  error_percent: number
})
```

---

# 8. Team Collaboration & Notifications

## 8.1 Team Management & Roles

### FR 8.1.1: Team Role-Based Access Control
**Description**: Implement comprehensive role-based access control (RBAC) system for teams with hierarchical permissions, project-level access, and granular capability management.

**Impact Weighting**: Medium-High (Essential for multi-user collaboration)

**Priority**: P1 - High

**Dependencies**:
- Authentication system (Section 11)
- Project and client management
- Artifact permissions (FR 4.3.2)
- Database integration via SAOL

**User Stories**: US8.1.1, US8.1.2

**Tasks**:
1. Define role hierarchy and permission model
2. Implement role assignment and management interface
3. Create permission inheritance from team to project to job
4. Add role-based UI filtering (hide features user can't access)
5. Implement audit logging for role changes
6. Create role templates for common team structures
7. Add emergency access escalation mechanism

**User Story Acceptance Criteria**:

#### US8.1.1: As a team administrator, I need to manage user roles to control access to training resources
- Given I have admin role on a team
- When I assign roles to team members
- Then each role has predefined capabilities (view, create, edit, delete jobs/artifacts)
- And role changes take effect immediately
- And affected users receive notification of role change
- And role changes are logged in audit trail

#### US8.1.2: As a team member, I need clear visibility into my permissions to understand what actions I can perform
- Given I am logged in as team member
- When I view training jobs and artifacts
- Then UI clearly indicates which actions I'm permitted to perform
- And disabled actions show tooltip explaining required permission
- And I can view my current role and capabilities
- And I can request permission elevation if needed

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(200) NOT NULL,
  team_slug VARCHAR(100) UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Team roles
CREATE TABLE team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(100) NOT NULL,
  role_slug VARCHAR(50) NOT NULL,
  role_level INTEGER NOT NULL, -- 0=guest, 1=viewer, 2=member, 3=admin, 4=owner
  
  -- Capabilities
  can_view_jobs BOOLEAN DEFAULT true,
  can_create_jobs BOOLEAN DEFAULT false,
  can_edit_jobs BOOLEAN DEFAULT false,
  can_delete_jobs BOOLEAN DEFAULT false,
  can_view_artifacts BOOLEAN DEFAULT true,
  can_download_artifacts BOOLEAN DEFAULT false,
  can_delete_artifacts BOOLEAN DEFAULT false,
  can_view_costs BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  can_manage_roles BOOLEAN DEFAULT false,
  
  is_system_role BOOLEAN DEFAULT false, -- Built-in roles can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO team_roles (role_name, role_slug, role_level, can_view_jobs, can_create_jobs, can_edit_jobs, can_delete_jobs, can_view_artifacts, can_download_artifacts, can_delete_artifacts, can_view_costs, can_manage_team, can_manage_roles, is_system_role) VALUES
('Owner', 'owner', 4, true, true, true, true, true, true, true, true, true, true, true),
('Admin', 'admin', 3, true, true, true, true, true, true, true, true, true, false, true),
('Member', 'member', 2, true, true, true, false, true, true, false, false, false, false, true),
('Viewer', 'viewer', 1, true, false, false, false, true, false, false, false, false, false, true),
('Guest', 'guest', 0, true, false, false, false, false, false, false, false, false, false, true);

-- Team memberships
CREATE TABLE team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES team_roles(id),
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_memberships_team ON team_memberships(team_id);
CREATE INDEX idx_memberships_user ON team_memberships(user_id);

-- Role change audit log
CREATE TABLE team_role_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  
  old_role_id UUID REFERENCES team_roles(id),
  new_role_id UUID REFERENCES team_roles(id),
  change_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_role_changes_team ON team_role_changes(team_id);
CREATE INDEX idx_role_changes_user ON team_role_changes(user_id);
```

##### UI/UX Requirements
- Team member list with role badges
- Role assignment dropdown with capability preview
- Permission matrix view (roles × capabilities)
- Bulk role assignment for multiple users
- Role change confirmation dialog with impact summary
- My permissions panel showing current capabilities
- Permission request form for elevation
- Audit log viewer for role changes

##### API Requirements
```typescript
// Get team members with roles
GET /api/teams/{id}/members
Response: {
  members: Array<{
    user_id: UUID
    user_name: string
    user_email: string
    role: {
      role_id: UUID
      role_name: string
      role_level: number
      capabilities: Record<string, boolean>
    }
    joined_at: string
  }>
  total_count: number
}

// Update team member role
PUT /api/teams/{team_id}/members/{user_id}/role
Body: {
  new_role_id: UUID
  change_reason?: string
}
Response: {
  success: boolean
  new_role: {
    role_name: string
    capabilities: Record<string, boolean>
  }
  notification_sent: boolean
}

// Get current user's permissions in team
GET /api/teams/{id}/my-permissions
Response: {
  role: {
    role_name: string
    role_level: number
  }
  capabilities: Record<string, boolean>
  can_request_elevation: boolean
}

// Request permission elevation
POST /api/teams/{id}/request-elevation
Body: {
  requested_capability: string
  justification: string
  duration_hours?: number // Temporary elevation
}
Response: {
  request_id: UUID
  status: 'pending' | 'approved' | 'denied'
  approver_notified: boolean
}
```

##### Calculation Requirements
- **Effective Permission**: User has permission if their role grants it OR they have explicit permission override
- **Role Level Comparison**: Higher level = more permissions (owner > admin > member > viewer > guest)
- **Permission Inheritance**: Project permissions inherit from team permissions unless explicitly overridden

##### Error Handling Requirements
- **Insufficient Permission**: Return 403 with required capability name
- **Last Owner Removal**: Prevent removing last owner role, return 400 with warning
- **Role Assignment to Self**: Prevent users from elevating their own role, return 403
- **Invalid Role Level**: Ensure new role level doesn't exceed assigner's level

##### Accessibility Requirements
- Role assignment dropdown keyboard navigable
- Screen reader announces role changes
- High contrast mode for role level indicators
- ARIA labels for all permission toggles
- Keyboard shortcuts for common actions (A for assign role, R for view roles)

##### Performance Requirements
- Team member list loading: <500ms for teams up to 100 members
- Role update: <200ms
- Permission check: <50ms (cached after first check)
- Audit log query: <1s for up to 10,000 events

##### Analytics Requirements
```typescript
analytics.track('team_role_assigned', {
  team_id: string,
  user_id: string,
  role_name: string,
  assigned_by: string
})

analytics.track('permission_elevation_requested', {
  team_id: string,
  user_id: string,
  requested_capability: string,
  justification_provided: boolean
})

analytics.track('permission_check_failed', {
  team_id: string,
  user_id: string,
  attempted_action: string,
  required_capability: string
})
```

---

### FR 8.1.2: Team Invitation & Onboarding
**Description**: Implement streamlined team invitation system with email invitations, onboarding workflow, and team discovery features.

**Impact Weighting**: Medium (Enhances collaboration setup)

**Priority**: P2 - Medium

**Dependencies**:
- FR 8.1.1 (Team Role-Based Access Control)
- Email notification system (FR 8.2.1)
- Authentication (Section 11)

**User Stories**: US8.1.1

**Tasks**:
1. Create email invitation system with secure tokens
2. Implement invitation acceptance workflow
3. Add bulk invitation support (CSV upload)
4. Create team onboarding checklist
5. Implement team discovery for internal users
6. Add invitation expiration and resend functionality

**User Story Acceptance Criteria**:

#### US8.1.1: Enhanced team invitation workflow
- Given I am team admin
- When I invite new members via email
- Then invitees receive email with secure invitation link
- And invitation link expires after 7 days
- And I can resend or revoke pending invitations
- And new members see onboarding guide upon first login
- And invitation status is tracked (pending, accepted, expired)

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Team invitations
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  invitation_token VARCHAR(64) UNIQUE NOT NULL,
  role_id UUID NOT NULL REFERENCES team_roles(id),
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  
  personal_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_team ON team_invitations(team_id);
CREATE INDEX idx_invitations_email ON team_invitations(invited_email);
CREATE INDEX idx_invitations_token ON team_invitations(invitation_token) WHERE status = 'pending';
CREATE INDEX idx_invitations_status ON team_invitations(status, expires_at);

-- Onboarding progress
CREATE TABLE team_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  
  checklist_items JSONB DEFAULT '[]'::jsonb,
  completed_items TEXT[],
  
  onboarding_started_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed_at TIMESTAMPTZ,
  
  UNIQUE(user_id, team_id)
);
```

##### UI/UX Requirements
- Invitation form with email input, role selector, and optional message
- Pending invitations list with status badges
- Bulk invitation uploader (CSV format: email, role, message)
- Invitation acceptance page with team preview
- Onboarding checklist modal with progress indicator
- Team discovery page for browsing public teams

##### API Requirements
```typescript
// Send team invitation
POST /api/teams/{id}/invite
Body: {
  email: string
  role_id: UUID
  personal_message?: string
  expires_in_days?: number // Default: 7
}
Response: {
  invitation_id: UUID
  invitation_sent: boolean
  expires_at: string
}

// Bulk invite
POST /api/teams/{id}/invite-bulk
Body: {
  invitations: Array<{
    email: string
    role_id: UUID
    personal_message?: string
  }>
}
Response: {
  successful_invitations: number
  failed_invitations: Array<{ email: string, error: string }>
}

// Accept invitation
POST /api/invitations/{token}/accept
Response: {
  team_id: UUID
  team_name: string
  role_assigned: string
  onboarding_required: boolean
}

// Get pending invitations (for team admin)
GET /api/teams/{id}/invitations?status=pending
Response: {
  invitations: Array<{
    id: UUID
    invited_email: string
    role_name: string
    invited_by: string
    status: string
    expires_at: string
    created_at: string
  }>
}

// Revoke invitation
DELETE /api/invitations/{id}
Response: {
  success: boolean
  revoked_at: string
}
```

##### Calculation Requirements
- **Invitation Token**: Cryptographically secure random 64-character string
- **Expiration Time**: `current_time + expires_in_days * 24 hours`
- **Onboarding Progress**: `(completed_items.length / total_items.length) * 100`

##### Error Handling Requirements
- **Duplicate Invitation**: Check for existing pending invitation, offer to resend
- **Invalid Email**: Validate email format, return 400
- **User Already Member**: Return 409 with member status
- **Expired Token**: Return 410, offer to request new invitation
- **Revoked Invitation**: Return 403 with reason

##### Accessibility Requirements
- Invitation form keyboard accessible
- Screen reader support for invitation status
- High contrast mode for status badges
- Onboarding checklist keyboard navigable

##### Performance Requirements
- Single invitation: <500ms including email send
- Bulk invitation: Process 50 invitations per second
- Invitation acceptance: <300ms
- Pending invitations query: <500ms

##### Analytics Requirements
```typescript
analytics.track('team_invitation_sent', {
  team_id: string,
  invited_by: string,
  role_name: string,
  bulk_invite: boolean
})

analytics.track('team_invitation_accepted', {
  team_id: string,
  invitation_id: string,
  time_to_accept_hours: number
})

analytics.track('onboarding_completed', {
  team_id: string,
  user_id: string,
  completion_time_minutes: number
})
```

---

## 8.2 Notification System

### FR 8.2.1: Multi-Channel Notification Delivery
**Description**: Implement comprehensive notification system supporting email, in-app, and webhook delivery with user preferences and notification templates.

**Impact Weighting**: Medium (Enhances user engagement and awareness)

**Priority**: P1 - High

**Dependencies**:
- Email service integration
- WebSocket or polling for real-time in-app notifications
- Training job events (Part A: Section 1)
- Team memberships (FR 8.1.1)

**User Stories**: US8.2.1, US8.2.2

**Tasks**:
1. Implement notification queue and delivery system
2. Create email templates for common notifications
3. Add in-app notification center with read/unread tracking
4. Implement webhook delivery for external integrations
5. Create notification preference management UI
6. Add notification batching to prevent spam
7. Implement notification retry logic with exponential backoff

**User Story Acceptance Criteria**:

#### US8.2.1: As a team member, I need notifications for important events so I stay informed
- Given I am member of team with training jobs
- When job completes, fails, or requires attention
- Then I receive notification via my preferred channel(s)
- And notification includes: event type, job name, timestamp, action links
- And I can mark notifications as read/unread
- And I can configure which events trigger notifications

#### US8.2.2: As a project manager, I need webhook notifications to integrate with external tools
- Given I configure webhook URL for team
- When training events occur (job complete, cost threshold exceeded)
- Then system sends POST request to webhook URL with event payload
- And webhook delivery includes retry logic (3 attempts with exponential backoff)
- And I can view webhook delivery logs (success/failure)
- And I can test webhook configuration before saving

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Notification channels
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('email', 'in_app', 'webhook', 'slack')),
  channel_config JSONB NOT NULL, -- email address, webhook URL, etc.
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipients
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_team_id UUID REFERENCES teams(id),
  
  -- Notification content
  notification_type VARCHAR(50) NOT NULL, -- 'job_completed', 'job_failed', 'cost_alert', etc.
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  event_data JSONB,
  
  -- Metadata
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  
  -- Delivery tracking
  delivery_channels TEXT[] DEFAULT ARRAY['in_app'], -- Channels to deliver to
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  CHECK ((recipient_user_id IS NOT NULL) OR (recipient_team_id IS NOT NULL))
);

CREATE INDEX idx_notifications_user ON notifications(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX idx_notifications_team ON notifications(recipient_team_id) WHERE recipient_team_id IS NOT NULL;
CREATE INDEX idx_notifications_read ON notifications(recipient_user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(notification_type, created_at);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Event subscriptions
  subscribed_events JSONB NOT NULL DEFAULT '{
    "job_completed": {"email": true, "in_app": true},
    "job_failed": {"email": true, "in_app": true},
    "checkpoint_saved": {"email": false, "in_app": true},
    "cost_alert": {"email": true, "in_app": true},
    "quality_threshold_met": {"email": true, "in_app": true},
    "team_invitation": {"email": true, "in_app": true}
  }'::jsonb,
  
  -- Delivery preferences
  email_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'hourly', 'daily', 'never')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Webhook configurations
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  webhook_name VARCHAR(100) NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(64), -- For signature verification
  
  subscribed_events TEXT[] NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  
  -- Delivery tracking
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status VARCHAR(20),
  failure_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_webhooks_team ON webhook_configs(team_id);

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  
  delivery_attempt INTEGER DEFAULT 1,
  http_status_code INTEGER,
  response_body TEXT,
  
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'success', 'failed', 'retrying')),
  
  next_retry_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_config ON webhook_deliveries(webhook_config_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(delivery_status, next_retry_at);
```

##### UI/UX Requirements
- Notification bell icon with unread count badge
- Notification center dropdown with scrollable list
- Notification preference panel with event toggle matrix
- Webhook configuration form with URL input and test button
- Webhook delivery log viewer with status indicators
- Notification filtering (by type, read/unread, date)
- Mark all as read button

##### API Requirements
```typescript
// Get user notifications
GET /api/notifications?unread_only=true&limit=50
Response: {
  notifications: Array<{
    id: UUID
    notification_type: string
    title: string
    message: string
    priority: string
    action_url: string
    created_at: string
    read_at: string | null
  }>
  unread_count: number
  total_count: number
}

// Mark notification as read
PUT /api/notifications/{id}/read
Response: {
  success: boolean
  read_at: string
}

// Mark all as read
PUT /api/notifications/read-all
Response: {
  marked_count: number
}

// Update notification preferences
PUT /api/notifications/preferences
Body: {
  subscribed_events: Record<string, { email: boolean, in_app: boolean }>
  email_frequency?: 'immediate' | 'hourly' | 'daily' | 'never'
  quiet_hours?: { start: string, end: string }
}
Response: {
  success: boolean
  updated_preferences: NotificationPreferences
}

// Create webhook configuration
POST /api/teams/{id}/webhooks
Body: {
  webhook_name: string
  webhook_url: string
  webhook_secret?: string
  subscribed_events: string[]
}
Response: {
  webhook_id: UUID
  test_delivery_initiated: boolean
}

// Test webhook
POST /api/webhooks/{id}/test
Response: {
  test_delivery_id: UUID
  http_status_code: number
  response_body: string
  success: boolean
}

// Get webhook delivery logs
GET /api/webhooks/{id}/deliveries?status={status}&limit=50
Response: {
  deliveries: Array<{
    id: UUID
    event_type: string
    delivery_attempt: number
    http_status_code: number
    delivery_status: string
    delivered_at: string
  }>
  success_rate: number
}
```

##### Calculation Requirements
- **Unread Count**: `COUNT(*) WHERE recipient_user_id = {user} AND read_at IS NULL`
- **Retry Backoff**: 
  ```
  next_retry_delay = min(60 * (2 ^ attempt), 3600) seconds
  attempt 1: 2 minutes
  attempt 2: 4 minutes
  attempt 3: 8 minutes
  max: 60 minutes
  ```
- **Notification Batching**: Group notifications by type if >5 similar notifications in 10-minute window
- **Webhook Signature**: `HMAC-SHA256(webhook_secret, payload_json)`

##### Error Handling Requirements
- **Email Delivery Failure**: Log error, retry 3 times, mark as failed if all attempts fail
- **Webhook Timeout**: 30-second timeout, retry with exponential backoff
- **Invalid Webhook URL**: Validate URL format on save, return 400
- **Webhook 4xx Response**: Don't retry, log as permanent failure
- **Webhook 5xx Response**: Retry with backoff
- **Quiet Hours**: Queue notifications during quiet hours, deliver when quiet hours end

##### Accessibility Requirements
- Notification center keyboard navigable (arrow keys, Enter to open)
- Screen reader announces new notifications (ARIA live region)
- High contrast mode for unread badges
- Keyboard shortcuts (N for notifications, M for mark as read)
- Alternative text for notification icons

##### Performance Requirements
- Notification creation: <100ms
- Notification list query: <300ms for up to 1,000 notifications
- Email delivery: <2s
- Webhook delivery: <5s (with 30s timeout)
- Real-time notification push: <500ms latency
- Batch notification processing: 100 notifications per second

##### Analytics Requirements
```typescript
analytics.track('notification_sent', {
  notification_type: string,
  delivery_channels: string[],
  priority: string,
  recipient_user_id: string
})

analytics.track('notification_read', {
  notification_id: string,
  notification_type: string,
  time_to_read_minutes: number
})

analytics.track('webhook_delivered', {
  webhook_id: string,
  event_type: string,
  delivery_attempt: number,
  http_status_code: number,
  success: boolean
})

analytics.track('notification_preferences_updated', {
  user_id: string,
  changes: Record<string, any>
})
```

---

### FR 8.2.2: Event Subscription Management
**Description**: Implement fine-grained event subscription system allowing users and teams to customize which events trigger notifications.

**Impact Weighting**: Medium (Reduces notification fatigue)

**Priority**: P2 - Medium

**Dependencies**:
- FR 8.2.1 (Multi-Channel Notification Delivery)
- Training job events
- Team management

**User Stories**: US8.2.1

**Tasks**:
1. Define comprehensive event taxonomy
2. Implement event filtering rules (by job, project, severity)
3. Create subscription templates for common roles
4. Add event preview before subscribing
5. Implement subscription inheritance from team to user
6. Add notification frequency controls (immediate, digest, never)

**User Story Acceptance Criteria**:

#### US8.2.1: Enhanced event subscription management
- Given I want to customize my notifications
- When I configure event subscriptions
- Then I can subscribe at granular levels (all jobs, specific project, specific job)
- And I can filter by event severity (info, warning, error, critical)
- And I can choose delivery method per event type (email, in-app, both, none)
- And I can preview notifications before subscribing
- And I can use subscription templates (data scientist, project manager, admin)

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Event subscriptions
CREATE TABLE event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription scope
  scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('all', 'team', 'project', 'job')),
  scope_id UUID, -- NULL for 'all', team/project/job ID otherwise
  
  -- Event filters
  event_types TEXT[], -- NULL = all events
  min_severity VARCHAR(10) DEFAULT 'info' CHECK (min_severity IN ('info', 'warning', 'error', 'critical')),
  
  -- Delivery configuration
  delivery_channels TEXT[] DEFAULT ARRAY['in_app'],
  delivery_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (delivery_frequency IN ('immediate', 'hourly_digest', 'daily_digest', 'never')),
  
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON event_subscriptions(user_id);
CREATE INDEX idx_subscriptions_scope ON event_subscriptions(scope_type, scope_id);

-- Subscription templates
CREATE TABLE subscription_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  template_description TEXT,
  
  -- Template configuration
  default_subscriptions JSONB NOT NULL,
  target_role VARCHAR(50), -- 'data_scientist', 'project_manager', 'admin'
  
  is_system_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### UI/UX Requirements
- Subscription management panel with scope selector
- Event type checklist with search/filter
- Severity slider (info, warning, error, critical)
- Delivery method toggle per event
- Subscription template selector with preview
- "Try this subscription" simulation tool

##### API Requirements
```typescript
// Create event subscription
POST /api/subscriptions
Body: {
  scope_type: 'all' | 'team' | 'project' | 'job'
  scope_id?: UUID
  event_types?: string[]
  min_severity?: 'info' | 'warning' | 'error' | 'critical'
  delivery_channels: string[]
  delivery_frequency: 'immediate' | 'hourly_digest' | 'daily_digest' | 'never'
}
Response: {
  subscription_id: UUID
  effective_events: string[] // Events that will trigger notifications
}

// Apply subscription template
POST /api/subscriptions/apply-template/{template_id}
Response: {
  created_subscriptions: number
  subscription_ids: UUID[]
}

// Preview subscription
POST /api/subscriptions/preview
Body: {
  scope_type: string
  scope_id?: UUID
  event_types?: string[]
  min_severity: string
}
Response: {
  estimated_notifications_per_day: number
  sample_events: Array<{
    event_type: string
    title: string
    severity: string
  }>
}

// Get subscription templates
GET /api/subscriptions/templates
Response: {
  templates: Array<{
    id: UUID
    template_name: string
    template_description: string
    target_role: string
    subscription_count: number
  }>
}
```

##### Calculation Requirements
- **Effective Events**: Resolve inheritance (job-specific overrides project-specific overrides team-wide overrides all)
- **Notification Estimate**: 
  ```
  estimate = avg_events_per_day * (matched_event_types.length / total_event_types.length)
  ```
- **Severity Filtering**: Include events with severity >= min_severity

##### Error Handling Requirements
- **Conflicting Subscriptions**: Warn user, use most specific scope
- **Invalid Scope ID**: Return 404 with scope type details
- **Too Many Subscriptions**: Limit to 50 active subscriptions per user
- **Template Application Failure**: Return partial success with error details

##### Accessibility Requirements
- Subscription panel keyboard navigable
- Screen reader support for event type checkboxes
- High contrast mode for severity indicators
- ARIA labels for all subscription controls

##### Performance Requirements
- Subscription creation: <300ms
- Template application: <2s for up to 20 subscriptions
- Preview calculation: <1s
- Subscription query: <200ms

##### Analytics Requirements
```typescript
analytics.track('subscription_created', {
  scope_type: string,
  event_types_count: number,
  delivery_channels: string[]
})

analytics.track('subscription_template_applied', {
  template_id: string,
  template_name: string,
  subscriptions_created: number
})

analytics.track('subscription_preview_viewed', {
  estimated_notifications_per_day: number
})
```

---

## 8.3 Activity Feed & Collaboration

### FR 8.3.1: Team Activity Timeline
**Description**: Implement real-time activity feed showing team actions, training events, and collaboration activity with filtering and search capabilities.

**Impact Weighting**: Medium (Enhances team awareness)

**Priority**: P2 - Medium

**Dependencies**:
- FR 8.1.1 (Team Management)
- Training job events
- Artifact operations
- Database integration via SAOL

**User Stories**: US8.3.1

**Tasks**:
1. Create activity logging system for team actions
2. Implement activity feed with pagination and filtering
3. Add real-time activity updates (WebSocket or polling)
4. Create activity search with full-text indexing
5. Implement activity aggregation (group similar events)
6. Add activity export functionality

**User Story Acceptance Criteria**:

#### US8.3.1: As a team member, I need activity feed to stay aware of team progress
- Given I am member of active team
- When I view activity feed
- Then I see chronological list of: job starts/completions, artifact uploads, role changes, comments
- And activities are grouped by time (today, yesterday, this week)
- And I can filter by activity type, user, date range
- And feed updates in real-time without page refresh
- And I can search activity history

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Activity feed
CREATE TABLE team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type VARCHAR(50) NOT NULL, -- 'job_created', 'artifact_uploaded', 'member_added', etc.
  actor_user_id UUID REFERENCES auth.users(id),
  
  -- Activity content
  title VARCHAR(200) NOT NULL,
  description TEXT,
  activity_data JSONB,
  
  -- References
  related_job_id UUID REFERENCES training_jobs(id),
  related_artifact_id UUID REFERENCES training_artifacts(id),
  related_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_team ON team_activities(team_id, created_at DESC);
CREATE INDEX idx_activities_type ON team_activities(activity_type);
CREATE INDEX idx_activities_actor ON team_activities(actor_user_id);
CREATE INDEX idx_activities_job ON team_activities(related_job_id) WHERE related_job_id IS NOT NULL;

-- Full-text search index
CREATE INDEX idx_activities_search ON team_activities USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

##### UI/UX Requirements
- Activity feed with infinite scroll or pagination
- Activity cards with icon, timestamp, actor, and action
- Filter panel (activity type, date range, user)
- Search bar with autocomplete
- Time grouping headers (Today, Yesterday, This Week, Earlier)
- Real-time activity badge ("3 new activities")
- Export button (JSON, CSV)

##### API Requirements
```typescript
// Get activity feed
GET /api/teams/{id}/activities?type={type}&user_id={id}&from={date}&to={date}&limit=50&offset=0
Response: {
  activities: Array<{
    id: UUID
    activity_type: string
    actor: {
      user_id: UUID
      user_name: string
    }
    title: string
    description: string
    related_resources: {
      job_id?: UUID
      artifact_id?: UUID
      user_id?: UUID
    }
    created_at: string
  }>
  total_count: number
  has_more: boolean
}

// Search activities
GET /api/teams/{id}/activities/search?q={query}&limit=50
Response: {
  activities: Array<Activity>
  total_count: number
}

// Subscribe to real-time activities (WebSocket)
WS /api/teams/{id}/activities/stream
Messages: {
  type: 'activity_created'
  activity: Activity
}
```

##### Calculation Requirements
- **Time Grouping**: 
  ```
  if activity_date == today: "Today"
  elif activity_date == yesterday: "Yesterday"
  elif activity_date >= 7 days ago: "This Week"
  else: "Earlier"
  ```
- **Activity Aggregation**: Group activities of same type from same user within 5-minute window
  - Example: "John uploaded 5 artifacts" instead of 5 separate "John uploaded artifact" entries

##### Error Handling Requirements
- **No Activities**: Display empty state with helpful message
- **Real-time Connection Failure**: Fall back to polling every 30 seconds
- **Search Timeout**: Return partial results after 5s, indicate incomplete

##### Accessibility Requirements
- Activity feed keyboard navigable (arrow keys, Enter to open details)
- Screen reader announces new activities (ARIA live region)
- High contrast mode for activity icons
- Alternative text for all activity type icons

##### Performance Requirements
- Activity feed loading: <500ms for 50 activities
- Real-time activity push: <1s latency
- Search: <1s for up to 10,000 activities
- Activity creation: <100ms

##### Analytics Requirements
```typescript
analytics.track('activity_feed_viewed', {
  team_id: string,
  filter_applied: boolean,
  activity_count_displayed: number
})

analytics.track('activity_searched', {
  team_id: string,
  search_query: string,
  result_count: number
})
```

---

# 9. System Integration Requirements

## 9.1 RunPod Integration

### FR 9.1.1: RunPod API Integration & Error Handling
**Description**: Implement robust integration with RunPod API for GPU instance provisioning, monitoring, and management with comprehensive error handling and retry logic.

**Impact Weighting**: High (Critical for core functionality)

**Priority**: P0 - Critical

**Dependencies**:
- RunPod API credentials and configuration
- Training job management (Part A: `C:\Users\james\Master\BrightHub\brun\v4-show\pmc\product\03-pipeline-functional-requirements.md`, Section 1)
- Cost tracking (Part A: Section 6)
- SAOL library for database operations

**User Stories**: US9.1.1, US9.1.2

**Tasks**:
1. Implement RunPod API client with authentication
2. Create GPU instance provisioning workflow
3. Add instance status monitoring with webhook support
4. Implement error handling for API failures
5. Create instance lifecycle management (start, stop, terminate)
6. Add API rate limiting and throttling
7. Implement fallback strategies for spot instance unavailability

**User Story Acceptance Criteria**:

#### US9.1.1: As a system, I need reliable RunPod integration to provision GPU instances
- Given a training job requires GPU instance
- When system requests instance from RunPod
- Then instance is provisioned with specified GPU type and configuration
- And system monitors instance status via webhook or polling
- And instance ID is stored and linked to training job
- And instance is automatically terminated when job completes

#### US9.1.2: As a system, I need robust error handling for RunPod API failures
- Given RunPod API request fails
- When error occurs (network, API, rate limit, quota)
- Then system retries with exponential backoff (up to 3 attempts)
- And detailed error is logged with context
- And user is notified of failure with actionable message
- And job status is updated to reflect error state

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- RunPod instance tracking
CREATE TABLE runpod_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  
  -- RunPod details
  runpod_instance_id VARCHAR(100) UNIQUE NOT NULL,
  gpu_type VARCHAR(50) NOT NULL,
  gpu_count INTEGER DEFAULT 1,
  instance_type VARCHAR(20) NOT NULL CHECK (instance_type IN ('spot', 'on_demand')),
  
  -- Status tracking
  instance_status VARCHAR(30) NOT NULL DEFAULT 'provisioning' CHECK (instance_status IN ('provisioning', 'running', 'stopping', 'stopped', 'terminated', 'failed')),
  status_message TEXT,
  
  -- Connection details
  pod_ip_address INET,
  ssh_port INTEGER,
  connection_string TEXT,
  
  -- Lifecycle timestamps
  provisioned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  
  -- Cost tracking
  hourly_rate_usd DECIMAL(8,4),
  runtime_hours DECIMAL(10,2),
  total_cost_usd DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_runpod_instances_job ON runpod_instances(job_id);
CREATE INDEX idx_runpod_instances_runpod_id ON runpod_instances(runpod_instance_id);
CREATE INDEX idx_runpod_instances_status ON runpod_instances(instance_status);

-- RunPod API request logs
CREATE TABLE runpod_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request details
  request_type VARCHAR(50) NOT NULL, -- 'create_pod', 'stop_pod', 'get_pod', etc.
  request_payload JSONB,
  
  -- Response details
  response_status_code INTEGER,
  response_body JSONB,
  error_message TEXT,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  is_retry BOOLEAN DEFAULT false,
  
  -- Related resources
  instance_id UUID REFERENCES runpod_instances(id),
  job_id UUID REFERENCES training_jobs(id),
  
  request_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_logs_request_type ON runpod_api_logs(request_type, created_at);
CREATE INDEX idx_api_logs_instance ON runpod_api_logs(instance_id);
CREATE INDEX idx_api_logs_error ON runpod_api_logs(error_message) WHERE error_message IS NOT NULL;
```

##### UI/UX Requirements
- RunPod instance status indicator in job detail view
- Instance provisioning progress with real-time updates
- RunPod API error display with retry button
- Instance cost accumulator (live counter during runtime)
- Instance connection details panel (IP, SSH command)
- RunPod API logs viewer for debugging

##### API Requirements
```typescript
// Provision RunPod instance (internal API)
POST /api/internal/runpod/provision
Body: {
  job_id: UUID
  gpu_type: 'H100_PCIE_80GB' | 'A100_80GB' | 'A6000'
  gpu_count: number
  instance_type: 'spot' | 'on_demand'
  docker_image: string
  environment_variables: Record<string, string>
  volume_mounts?: Array<{ source: string, target: string }>
}
Response: {
  instance_id: UUID
  runpod_instance_id: string
  instance_status: string
  estimated_startup_time_seconds: number
  hourly_rate_usd: number
}

// Get instance status
GET /api/internal/runpod/instances/{id}/status
Response: {
  instance_id: UUID
  runpod_instance_id: string
  instance_status: string
  status_message: string
  pod_ip_address: string
  ssh_connection: string
  runtime_hours: number
  current_cost_usd: number
}

// Terminate instance
POST /api/internal/runpod/instances/{id}/terminate
Response: {
  success: boolean
  terminated_at: string
  final_runtime_hours: number
  final_cost_usd: number
}

// RunPod webhook endpoint
POST /api/webhooks/runpod
Headers: X-RunPod-Signature: {signature}
Body: {
  event_type: 'pod_started' | 'pod_stopped' | 'pod_failed'
  pod_id: string
  pod_status: string
  timestamp: string
}
Response: {
  acknowledged: boolean
}
```

##### Calculation Requirements
- **Runtime Hours**: `(terminated_at || NOW()) - started_at` in hours (decimal)
- **Total Cost**: `runtime_hours * hourly_rate_usd`
- **Startup Time Estimate**: Based on GPU type (H100: 2min, A100: 3min, A6000: 4min)
- **Retry Backoff**: 
  ```
  retry_delay = min(2 ^ attempt * 5, 300) seconds
  attempt 1: 10s
  attempt 2: 20s
  attempt 3: 40s
  max: 300s (5 minutes)
  ```

##### Error Handling Requirements
- **API Rate Limit (429)**: Wait for rate limit reset time, then retry
- **Quota Exceeded**: Notify user, suggest alternative GPU type or wait
- **Spot Instance Unavailable**: Auto-fallback to on-demand if configured, or notify user
- **Provisioning Timeout**: Cancel after 10 minutes, mark job as failed
- **Connection Failure**: Log error, queue job for retry after cooldown
- **Webhook Signature Verification Failure**: Reject request, log security event
- **Instance Termination Failure**: Retry termination, escalate to manual review after 3 failures

##### Accessibility Requirements
- Instance status announced to screen readers
- Error messages displayed prominently with clear resolution steps
- Keyboard shortcuts for retry actions

##### Performance Requirements
- Instance provisioning request: <2s response time
- Status check: <500ms
- Webhook processing: <200ms
- Termination request: <1s

##### Analytics Requirements
```typescript
analytics.track('runpod_instance_provisioned', {
  job_id: string,
  gpu_type: string,
  instance_type: 'spot' | 'on_demand',
  hourly_rate_usd: number,
  provisioning_duration_seconds: number
})

analytics.track('runpod_api_error', {
  request_type: string,
  error_type: string,
  error_message: string,
  attempt_number: number,
  will_retry: boolean
})

analytics.track('runpod_instance_terminated', {
  instance_id: string,
  runtime_hours: number,
  total_cost_usd: number,
  termination_reason: 'job_completed' | 'job_failed' | 'manual' | 'timeout'
})
```

---

### FR 9.1.2: Docker Container Management for Training
**Description**: Implement Docker container configuration, deployment, and lifecycle management for training workloads on RunPod instances.

**Impact Weighting**: High (Critical for training execution)

**Priority**: P0 - Critical

**Dependencies**:
- FR 9.1.1 (RunPod API Integration)
- Training job configuration
- Model and dataset storage

**User Stories**: US9.1.1

**Tasks**:
1. Create Docker image build and versioning system
2. Implement container configuration with environment variables
3. Add volume mounting for datasets and checkpoints
4. Create container health checking and restart logic
5. Implement log streaming from containers
6. Add container resource monitoring

**User Story Acceptance Criteria**:

#### US9.1.1: Enhanced Docker container management
- Given a training job is ready to execute
- When RunPod instance is provisioned
- Then correct Docker image is deployed with job-specific configuration
- And required volumes are mounted (dataset, checkpoint storage)
- And environment variables are injected (API keys, job ID, configuration)
- And container health is monitored with automatic restart on failure
- And container logs are streamed to job logs in real-time

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Docker image versions
CREATE TABLE docker_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_name VARCHAR(200) NOT NULL,
  image_tag VARCHAR(100) NOT NULL,
  image_digest VARCHAR(200),
  
  -- Image metadata
  base_model VARCHAR(100), -- 'llama-3-70b', etc.
  cuda_version VARCHAR(20),
  pytorch_version VARCHAR(20),
  transformers_version VARCHAR(20),
  
  build_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(image_name, image_tag)
);

-- Container configurations
CREATE TABLE container_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES runpod_instances(id),
  
  -- Docker configuration
  docker_image_id UUID NOT NULL REFERENCES docker_images(id),
  container_name VARCHAR(200),
  
  -- Runtime configuration
  environment_variables JSONB,
  volume_mounts JSONB,
  exposed_ports INTEGER[],
  
  -- Resource limits
  memory_gb INTEGER,
  cpu_cores INTEGER,
  gpu_ids INTEGER[],
  
  -- Health check configuration
  health_check_command TEXT,
  health_check_interval_seconds INTEGER DEFAULT 30,
  health_check_retries INTEGER DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_container_configs_job ON container_configs(job_id);
```

##### UI/UX Requirements
- Container status indicator in job view
- Container log viewer with real-time streaming
- Container resource usage graphs (CPU, memory, GPU)
- Docker image selector with version history
- Container configuration editor (environment variables, volumes)

##### API Requirements
```typescript
// Configure container for job
POST /api/internal/containers/configure
Body: {
  job_id: UUID
  docker_image_tag: string
  environment_variables: Record<string, string>
  volume_mounts: Array<{
    source: string // Storage bucket path
    target: string // Container mount path
    read_only: boolean
  }>
  resource_limits: {
    memory_gb: number
    cpu_cores: number
  }
}
Response: {
  config_id: UUID
  container_config: ContainerConfig
}

// Get container logs
GET /api/jobs/{id}/container-logs?from={timestamp}&lines=100
Response: {
  logs: Array<{
    timestamp: string
    log_level: string
    message: string
  }>
  has_more: boolean
}

// Stream container logs (WebSocket)
WS /api/jobs/{id}/container-logs/stream
Messages: {
  type: 'log_line'
  timestamp: string
  log_level: string
  message: string
}
```

##### Calculation Requirements
- **Container Resource Allocation**: 
  ```
  memory_allocation = job_dataset_size_gb * 1.5 + 20 (base overhead)
  cpu_cores = gpu_count * 8 (8 CPU cores per GPU)
  ```
- **Health Check Timing**: Check every 30 seconds, mark unhealthy after 3 consecutive failures

##### Error Handling Requirements
- **Container Start Failure**: Retry up to 3 times, log startup error, fail job
- **Container Crash**: Attempt automatic restart once, fail job if restart fails
- **Health Check Failure**: Log warning after 2 failures, restart container after 3 failures
- **Log Streaming Failure**: Buffer logs, resume streaming when connection restored
- **Volume Mount Failure**: Fail fast, notify user of missing storage resource

##### Accessibility Requirements
- Log viewer with text size controls
- Keyboard shortcuts for log navigation (Ctrl+Home, Ctrl+End, Page Up/Down)
- Screen reader support for log level indicators

##### Performance Requirements
- Container startup: <60s from RunPod instance ready
- Log streaming: <1s latency
- Log query: <500ms for up to 10,000 lines
- Health check execution: <5s

##### Analytics Requirements
```typescript
analytics.track('container_started', {
  job_id: string,
  docker_image: string,
  docker_tag: string,
  startup_duration_seconds: number
})

analytics.track('container_health_check_failed', {
  job_id: string,
  container_id: string,
  consecutive_failures: number,
  will_restart: boolean
})

analytics.track('container_crashed', {
  job_id: string,
  runtime_seconds: number,
  exit_code: number,
  error_message: string
})
```

---

## 9.2 Supabase Integration

### FR 9.2.1: SAOL (Supabase Agent Ops Library) Integration
**Description**: Implement mandatory use of SAOL library for all database operations, ensuring consistent service role authentication, preflight checks, and error handling patterns.

**Impact Weighting**: High (Critical for database reliability)

**Priority**: P0 - Critical

**Dependencies**:
- SAOL library (`C:\Users\james\Master\BrightHub\brun\v4-show\supa-agent-ops\`)
- Supabase project configuration
- All database-dependent features

**User Stories**: US9.2.1

**Tasks**:
1. Audit codebase for direct Supabase client usage (replace with SAOL)
2. Implement SAOL preflight check in application startup
3. Create SAOL wrapper for common database operations
4. Add SAOL error handling and retry logic
5. Implement SAOL logging and monitoring integration
6. Create SAOL usage guidelines and documentation

**User Story Acceptance Criteria**:

#### US9.2.1: As a developer, I must use SAOL for all database operations
- Given I need to perform database operation
- When I implement the operation
- Then I use SAOL library methods exclusively (no raw supabase-js)
- And SAOL handles service role authentication automatically
- And SAOL performs preflight checks before operations
- And SAOL provides consistent error handling
- And all database errors are logged with context

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- SAOL operation logs (for monitoring and debugging)
CREATE TABLE saol_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation details
  operation_type VARCHAR(50) NOT NULL, -- 'insert', 'update', 'delete', 'select', 'rpc'
  table_name VARCHAR(100),
  rpc_function_name VARCHAR(100),
  
  -- Operation metadata
  operation_duration_ms INTEGER,
  row_count INTEGER,
  
  -- Error tracking
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Request context
  user_id UUID,
  request_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saol_logs_operation ON saol_operation_logs(operation_type, created_at);
CREATE INDEX idx_saol_logs_table ON saol_operation_logs(table_name);
CREATE INDEX idx_saol_logs_errors ON saol_operation_logs(success, created_at) WHERE success = false;
```

##### Code Requirements
```typescript
// Example SAOL usage pattern
import { saol } from '@/supa-agent-ops'

// ✅ CORRECT: Using SAOL
async function createTrainingJob(jobData: CreateJobInput) {
  try {
    // SAOL automatically handles service role authentication
    const { data, error } = await saol
      .from('training_jobs')
      .insert(jobData)
      .select()
      .single()
    
    if (error) {
      // SAOL provides enriched error context
      throw new DatabaseError('Failed to create training job', error)
    }
    
    return data
  } catch (error) {
    // SAOL errors include retry hints and context
    logger.error('Job creation failed', { error, jobData })
    throw error
  }
}

// ❌ INCORRECT: Direct supabase-js usage
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key) // DON'T DO THIS
```

##### SAOL API Requirements
```typescript
// SAOL must provide these core methods:

// Query operations
saol.from(table: string)
  .select(columns?: string)
  .insert(data: Record<string, any> | Record<string, any>[])
  .update(data: Record<string, any>)
  .delete()
  .eq(column: string, value: any)
  .filter(column: string, operator: string, value: any)
  .order(column: string, options?: { ascending: boolean })
  .limit(count: number)
  .single()

// RPC operations
saol.rpc(functionName: string, params?: Record<string, any>)

// Storage operations
saol.storage
  .from(bucket: string)
  .upload(path: string, file: File | Blob, options?: UploadOptions)
  .download(path: string)
  .remove(paths: string[])
  .getPublicUrl(path: string)
  .createSignedUrl(path: string, expiresIn: number)

// Preflight check
saol.preflight()
  .checkConnection()
  .checkServiceRoleKey()
  .checkRequiredTables(tables: string[])
  .checkRequiredBuckets(buckets: string[])

// Configuration
saol.configure({
  logLevel: 'info' | 'warn' | 'error',
  retryAttempts: number,
  retryDelay: number,
  enableMetrics: boolean
})
```

##### Calculation Requirements
- **Retry Backoff**: 
  ```
  delay = base_delay * (2 ^ attempt)
  attempt 1: 1s
  attempt 2: 2s
  attempt 3: 4s
  max attempts: 3
  ```
- **Connection Timeout**: 10 seconds for initial connection, 30 seconds for queries
- **Operation Metrics**: Track P50, P95, P99 latencies per operation type

##### Error Handling Requirements
- **Connection Failure**: Retry with backoff, fail after 3 attempts
- **Service Role Key Invalid**: Fail immediately, log security alert
- **Table/Bucket Missing**: Fail preflight check, prevent application startup
- **Query Timeout**: Cancel query, return timeout error with context
- **Row Level Security Violation**: Log security event, return permission error
- **Transaction Failure**: Rollback automatically, provide rollback context in error

##### Accessibility Requirements
- N/A (developer-facing library)

##### Performance Requirements
- Preflight check: <2s for full check suite
- Query overhead: <10ms added latency from SAOL wrapper
- Bulk insert: Support batches of 1,000 rows
- Connection pooling: Reuse connections, maintain pool of 5-20 connections

##### Analytics Requirements
```typescript
analytics.track('saol_operation_executed', {
  operation_type: string,
  table_name: string,
  duration_ms: number,
  row_count: number,
  success: boolean
})

analytics.track('saol_preflight_check', {
  checks_passed: number,
  checks_failed: number,
  total_duration_ms: number
})

analytics.track('saol_error_occurred', {
  operation_type: string,
  table_name: string,
  error_code: string,
  error_message: string,
  retry_attempt: number
})
```

---

### FR 9.2.2: Supabase Storage Integration for Artifacts
**Description**: Implement Supabase Storage integration for training artifacts with lifecycle management, access control, and performance optimization.

**Impact Weighting**: High (Critical for artifact management)

**Priority**: P0 - Critical

**Dependencies**:
- FR 9.2.1 (SAOL Integration)
- FR 4.1.1 (Artifact Storage Structure)
- Supabase Storage buckets

**User Stories**: US9.2.1

**Tasks**:
1. Create Supabase Storage buckets with proper policies
2. Implement artifact upload via SAOL storage methods
3. Add resumable upload support for large files
4. Create storage quota monitoring
5. Implement lifecycle policies (archival, deletion)
6. Add CDN integration for faster downloads

**User Story Acceptance Criteria**:

#### US9.2.1: Enhanced Supabase Storage usage
- Given training artifacts need storage
- When artifacts are uploaded
- Then they are stored in appropriate Supabase Storage bucket
- And uploads are resumable for files >1GB
- And storage policies enforce access control (RLS)
- And lifecycle policies automatically archive old artifacts
- And downloads use CDN for faster transfer

**Functional Requirements Acceptance Criteria**:

##### Storage Bucket Configuration
```sql
-- Required Supabase Storage buckets:
-- 1. 'model-artifacts' - For checkpoints, adapters, final models
-- 2. 'training-logs' - For training logs and metrics
-- 3. 'datasets' - For training datasets
-- 4. 'archived-artifacts' - For archived/cold storage

-- Bucket policies (RLS)
-- model-artifacts bucket policy
CREATE POLICY "Users can upload artifacts for their jobs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'model-artifacts' AND
  EXISTS (
    SELECT 1 FROM training_jobs
    WHERE training_jobs.id::text = (storage.foldername(name))[1]
    AND training_jobs.created_by = auth.uid()
  )
);

CREATE POLICY "Users can download artifacts they have permission to"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'model-artifacts' AND
  EXISTS (
    SELECT 1 FROM training_artifacts
    JOIN artifact_download_permissions ON artifact_download_permissions.artifact_id = training_artifacts.id
    WHERE training_artifacts.storage_path = name
    AND (artifact_download_permissions.user_id = auth.uid() OR artifact_download_permissions.team_id IN (
      SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
    ))
  )
);
```

##### API Requirements
```typescript
// Upload artifact using SAOL
async function uploadArtifact(
  jobId: UUID,
  file: File,
  artifactType: string
): Promise<ArtifactUploadResult> {
  const storagePath = `${jobId}/${artifactType}/${file.name}`
  
  // SAOL handles resumable upload automatically for large files
  const { data, error } = await saol.storage
    .from('model-artifacts')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      resumable: file.size > 1_000_000_000 // 1GB threshold
    })
  
  if (error) {
    throw new StorageError('Artifact upload failed', error)
  }
  
  // Create artifact record in database
  const artifact = await saol
    .from('training_artifacts')
    .insert({
      job_id: jobId,
      artifact_type: artifactType,
      storage_path: storagePath,
      file_name: file.name,
      file_size_bytes: file.size,
      content_hash: await calculateHash(file),
      storage_bucket: 'model-artifacts'
    })
    .select()
    .single()
  
  return { artifactId: artifact.data.id, storagePath }
}

// Download artifact with CDN
async function getArtifactDownloadUrl(
  artifactId: UUID,
  expiresIn: number = 3600
): Promise<string> {
  const { data: artifact } = await saol
    .from('training_artifacts')
    .select('storage_path, storage_bucket')
    .eq('id', artifactId)
    .single()
  
  const { data: signedUrl } = await saol.storage
    .from(artifact.storage_bucket)
    .createSignedUrl(artifact.storage_path, expiresIn)
  
  return signedUrl.signedUrl
}
```

##### Calculation Requirements
- **Resumable Upload Threshold**: Files >1GB use resumable uploads
- **Chunk Size**: 10MB chunks for resumable uploads
- **Signed URL Expiration**: Default 1 hour, max 24 hours
- **Storage Quota Warning**: Alert at 80% utilization

##### Error Handling Requirements
- **Upload Failure**: Retry with exponential backoff, support resume from last successful chunk
- **Storage Quota Exceeded**: Return 507 status, suggest archival
- **Invalid File Type**: Validate before upload, return 400 with allowed types
- **Corrupted Upload**: Verify hash after upload, retry if mismatch
- **Missing Bucket**: Fail preflight check, prevent application startup

##### Accessibility Requirements
- N/A (backend integration)

##### Performance Requirements
- Upload throughput: ≥100 MB/s on H100 PCIe connection
- Download throughput: ≥100 MB/s via CDN
- Signed URL generation: <200ms
- Resumable upload chunk processing: <5s per 10MB chunk

##### Analytics Requirements
```typescript
analytics.track('storage_artifact_uploaded', {
  artifact_id: string,
  file_size_bytes: number,
  upload_duration_seconds: number,
  was_resumable: boolean
})

analytics.track('storage_download_url_generated', {
  artifact_id: string,
  expires_in_seconds: number,
  via_cdn: boolean
})

analytics.track('storage_quota_warning', {
  client_id: string,
  used_gb: number,
  quota_gb: number,
  utilization_percent: number
})
```

---

# 10. Operational Requirements

## 10.1 Monitoring & Observability

### FR 10.1.1: Application Performance Monitoring (APM)
**Description**: Implement comprehensive application performance monitoring for Next.js application with request tracing, error tracking, and performance metrics collection suitable for proof-of-concept deployment.

**Impact Weighting**: High (Critical for operational visibility)

**Priority**: P0 - Critical

**Dependencies**:
- Next.js application infrastructure
- Logging system
- SAOL integration (FR 9.2.1)

**User Stories**: US10.1.1

**Tasks**:
1. Integrate APM tool (e.g., Vercel Analytics, Sentry, or lightweight alternative)
2. Implement request/response time tracking
3. Add error boundary with error reporting
4. Create performance metrics dashboard
5. Implement slow query detection for database operations
6. Add custom performance markers for critical operations

**User Story Acceptance Criteria**:

#### US10.1.1: As a developer, I need performance monitoring to identify and fix bottlenecks
- Given the application is running
- When users perform operations
- Then all API requests are tracked with response times
- And slow requests (>2s) are flagged and logged
- And errors are captured with full context (stack trace, user, request)
- And I can view performance metrics in dashboard
- And database query performance is monitored

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Performance metrics (stored locally for PoC)
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request details
  request_path VARCHAR(500) NOT NULL,
  request_method VARCHAR(10) NOT NULL,
  request_duration_ms INTEGER NOT NULL,
  
  -- Response details
  response_status_code INTEGER NOT NULL,
  response_size_bytes INTEGER,
  
  -- User context
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(100),
  
  -- Performance markers
  db_query_time_ms INTEGER,
  external_api_time_ms INTEGER,
  processing_time_ms INTEGER,
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perf_metrics_path ON performance_metrics(request_path, created_at);
CREATE INDEX idx_perf_metrics_slow ON performance_metrics(request_duration_ms DESC) WHERE request_duration_ms > 2000;
CREATE INDEX idx_perf_metrics_errors ON performance_metrics(response_status_code) WHERE response_status_code >= 400;

-- Error logs
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Error details
  error_type VARCHAR(100) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Request context
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  request_body JSONB,
  
  -- User context
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(100),
  
  -- Error severity
  severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  
  -- Resolution tracking
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_unresolved ON error_logs(is_resolved, severity, created_at) WHERE is_resolved = false;
CREATE INDEX idx_error_logs_type ON error_logs(error_type, created_at);
```

##### UI/UX Requirements
- Performance dashboard with key metrics (avg response time, error rate, throughput)
- Slow request list with drill-down details
- Error log viewer with filtering and search
- Real-time performance graphs (last 24 hours)
- Error resolution tracking interface

##### API Requirements
```typescript
// Get performance metrics (internal dashboard)
GET /api/internal/metrics/performance?from={timestamp}&to={timestamp}
Response: {
  summary: {
    total_requests: number
    avg_response_time_ms: number
    p50_response_time_ms: number
    p95_response_time_ms: number
    p99_response_time_ms: number
    error_rate_percent: number
  }
  slow_requests: Array<{
    request_path: string
    request_duration_ms: number
    timestamp: string
  }>
  error_breakdown: Record<string, number> // error_type -> count
}

// Get error logs
GET /api/internal/errors?severity={severity}&resolved=false&limit=50
Response: {
  errors: Array<{
    id: UUID
    error_type: string
    error_message: string
    severity: string
    request_path: string
    user_id: UUID
    created_at: string
    is_resolved: boolean
  }>
  total_count: number
}

// Mark error as resolved
PUT /api/internal/errors/{id}/resolve
Body: {
  resolution_notes: string
}
Response: {
  success: boolean
  resolved_at: string
}
```

##### Calculation Requirements
- **Response Time Percentiles**: 
  ```
  P50: median response time
  P95: 95th percentile (slower than 95% of requests)
  P99: 99th percentile (slower than 99% of requests)
  ```
- **Error Rate**: `(error_count / total_requests) * 100`
- **Slow Request Threshold**: >2000ms for API requests, >5000ms for long-running operations
- **Throughput**: `total_requests / time_window_seconds`

##### Error Handling Requirements
- **Metric Collection Failure**: Log locally, don't block application flow
- **Dashboard Query Timeout**: Return partial results after 5s
- **Storage Quota Full**: Archive old metrics (>30 days), alert admin

##### Accessibility Requirements
- Dashboard keyboard navigable
- Screen reader support for metric summaries
- High contrast mode for performance graphs
- Alternative text-based metric tables

##### Performance Requirements (PoC Target)
- Metric collection overhead: <5ms per request
- Dashboard loading: <2s for 24-hour view
- Error log query: <1s for up to 10,000 errors
- Metric aggregation: <3s for daily summary

##### Analytics Requirements
```typescript
// Track critical performance events
analytics.track('slow_request_detected', {
  request_path: string,
  request_duration_ms: number,
  threshold_ms: 2000
})

analytics.track('error_occurred', {
  error_type: string,
  error_message: string,
  severity: string,
  request_path: string
})

analytics.track('error_resolved', {
  error_id: string,
  error_type: string,
  time_to_resolution_hours: number
})
```

---

### FR 10.1.2: Training Job Health Monitoring
**Description**: Implement health monitoring for active training jobs with anomaly detection, stuck job identification, and automatic recovery mechanisms.

**Impact Weighting**: Medium-High (Prevents resource waste)

**Priority**: P1 - High

**Dependencies**:
- Training job execution (Part A: Section 1)
- RunPod integration (FR 9.1.1)
- Checkpoint management (FR 4.2.1)

**User Stories**: US10.1.2

**Tasks**:
1. Create job health check service running every 5 minutes
2. Implement stuck job detection (no progress for 30+ minutes)
3. Add GPU utilization monitoring
4. Create automatic job restart for recoverable failures
5. Implement alert system for unhealthy jobs
6. Add health status visualization in job list

**User Story Acceptance Criteria**:

#### US10.1.2: As a system, I need to monitor job health to detect and recover from failures
- Given training jobs are running
- When health check service runs
- Then each active job is checked for: progress updates, GPU utilization, container health
- And stuck jobs (no progress >30min) are identified and flagged
- And jobs with low GPU utilization (<20%) are flagged
- And automatic recovery is attempted for transient failures
- And administrators are alerted for jobs requiring manual intervention

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Job health checks
CREATE TABLE job_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  
  -- Health metrics
  last_progress_update TIMESTAMPTZ,
  minutes_since_progress INTEGER,
  gpu_utilization_percent INTEGER,
  container_status VARCHAR(30),
  
  -- Health assessment
  health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'warning', 'unhealthy', 'critical')),
  health_issues TEXT[],
  
  -- Actions taken
  recovery_attempted BOOLEAN DEFAULT false,
  recovery_action VARCHAR(50),
  recovery_success BOOLEAN,
  
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_checks_job ON job_health_checks(job_id, checked_at DESC);
CREATE INDEX idx_health_checks_status ON job_health_checks(health_status, checked_at) WHERE health_status != 'healthy';

-- Automatic recovery logs
CREATE TABLE job_recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES training_jobs(id) ON DELETE CASCADE,
  health_check_id UUID REFERENCES job_health_checks(id),
  
  -- Recovery details
  failure_reason VARCHAR(100) NOT NULL,
  recovery_action VARCHAR(50) NOT NULL, -- 'restart_container', 'resume_from_checkpoint', 'terminate_and_alert'
  
  recovery_initiated_at TIMESTAMPTZ DEFAULT NOW(),
  recovery_completed_at TIMESTAMPTZ,
  recovery_success BOOLEAN,
  recovery_notes TEXT
);

CREATE INDEX idx_recovery_logs_job ON job_recovery_logs(job_id, recovery_initiated_at DESC);
```

##### UI/UX Requirements
- Job health status indicator (green/yellow/red badge)
- Health check history panel in job details
- Unhealthy jobs filter in job list
- Health issues tooltip on hover
- Recovery action log viewer
- Manual recovery trigger button (for admins)

##### API Requirements
```typescript
// Run health check (internal cron job)
POST /api/internal/jobs/health-check
Response: {
  jobs_checked: number
  healthy_jobs: number
  unhealthy_jobs: number
  recovery_actions_taken: number
  jobs_requiring_attention: Array<{
    job_id: UUID
    job_name: string
    health_status: string
    health_issues: string[]
  }>
}

// Get job health history
GET /api/jobs/{id}/health-history?limit=50
Response: {
  health_checks: Array<{
    id: UUID
    health_status: string
    health_issues: string[]
    minutes_since_progress: number
    gpu_utilization_percent: number
    recovery_attempted: boolean
    checked_at: string
  }>
}

// Manually trigger recovery
POST /api/jobs/{id}/recover
Body: {
  recovery_action: 'restart_container' | 'resume_from_checkpoint' | 'terminate'
  reason: string
}
Response: {
  recovery_log_id: UUID
  recovery_initiated: boolean
  estimated_recovery_time_minutes: number
}
```

##### Calculation Requirements
- **Minutes Since Progress**: `(NOW() - last_checkpoint_time) / 60`
- **Stuck Job Threshold**: No progress for 30 minutes
- **Low GPU Utilization Threshold**: <20% average over 10-minute window
- **Health Status Calculation**:
  ```
  if stuck OR container_crashed: 'critical'
  elif low_gpu_util OR no_progress_15min: 'warning'
  elif container_healthy AND progress_recent: 'healthy'
  else: 'unhealthy'
  ```

##### Error Handling Requirements
- **Health Check Failure**: Log error, continue checking other jobs
- **Recovery Action Failure**: Log failure, escalate to admin alert, don't retry automatically
- **False Positive Detection**: Allow manual override of stuck job detection
- **Concurrent Recovery Attempts**: Prevent multiple simultaneous recovery attempts for same job

##### Accessibility Requirements
- Health status announced to screen readers
- Keyboard shortcuts for viewing health details
- High contrast mode for health status badges

##### Performance Requirements (PoC Target)
- Health check execution: <5s for all active jobs
- Individual job check: <500ms
- Recovery action initiation: <2s
- Health history query: <500ms

##### Analytics Requirements
```typescript
analytics.track('job_health_check_completed', {
  jobs_checked: number,
  unhealthy_jobs: number,
  issues_detected: string[]
})

analytics.track('job_recovery_attempted', {
  job_id: string,
  failure_reason: string,
  recovery_action: string
})

analytics.track('job_recovery_completed', {
  job_id: string,
  recovery_action: string,
  recovery_success: boolean,
  recovery_duration_seconds: number
})
```

---

## 10.2 Logging & Debugging

### FR 10.2.1: Centralized Logging System
**Description**: Implement centralized logging system for application, training jobs, and system events with appropriate retention and search capabilities for proof-of-concept needs.

**Impact Weighting**: Medium-High (Essential for debugging)

**Priority**: P1 - High

**Dependencies**:
- Next.js application
- Training job execution
- RunPod integration
- SAOL integration

**User Stories**: US10.2.1

**Tasks**:
1. Implement structured logging with log levels (debug, info, warn, error, critical)
2. Create log aggregation from multiple sources (app, jobs, RunPod)
3. Add log search with filtering by level, source, timeframe
4. Implement log rotation and retention (30 days for PoC)
5. Create log export functionality
6. Add context correlation (trace requests across services)

**User Story Acceptance Criteria**:

#### US10.2.1: As a developer, I need centralized logs to debug issues across the system
- Given the application and training jobs are running
- When I access log viewer
- Then I see aggregated logs from: Next.js app, training jobs, RunPod containers, database operations
- And I can filter logs by: level, source, time range, keyword
- And I can search logs with full-text search
- And logs include context (request ID, user ID, job ID)
- And I can export logs for offline analysis

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Centralized application logs
CREATE TABLE application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Log metadata
  log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
  log_source VARCHAR(50) NOT NULL, -- 'nextjs_app', 'training_job', 'runpod_container', 'saol', 'webhook'
  
  -- Log content
  message TEXT NOT NULL,
  log_data JSONB,
  
  -- Context correlation
  request_id UUID,
  user_id UUID REFERENCES auth.users(id),
  job_id UUID REFERENCES training_jobs(id),
  
  -- Stack trace for errors
  stack_trace TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_logs_level ON application_logs(log_level, created_at);
CREATE INDEX idx_app_logs_source ON application_logs(log_source, created_at);
CREATE INDEX idx_app_logs_request ON application_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_app_logs_job ON application_logs(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_app_logs_search ON application_logs USING GIN (to_tsvector('english', message));

-- Partitioning strategy (for future scaling)
-- Partition by created_at (daily or weekly partitions) when log volume increases
```

##### Logging API Pattern
```typescript
// Structured logging utility
import { logger } from '@/lib/logger'

// Info log
logger.info('Training job started', {
  jobId: job.id,
  userId: user.id,
  requestId: req.id
})

// Error log with context
logger.error('Failed to provision RunPod instance', {
  error: error.message,
  stack: error.stack,
  jobId: job.id,
  gpuType: job.gpu_type,
  requestId: req.id
})

// Debug log (disabled in production for PoC)
logger.debug('Checkpoint uploaded', {
  jobId: job.id,
  checkpointStep: checkpoint.step,
  fileSize: file.size
})
```

##### UI/UX Requirements
- Log viewer with real-time streaming
- Filter panel (level, source, date range)
- Search bar with keyword highlighting
- Log detail modal with full context
- Export button (JSON, CSV, text)
- Context correlation view (show all logs for request/job)

##### API Requirements
```typescript
// Get application logs
GET /api/internal/logs?level={level}&source={source}&from={timestamp}&to={timestamp}&search={query}&limit=100
Response: {
  logs: Array<{
    id: UUID
    log_level: string
    log_source: string
    message: string
    log_data: Record<string, any>
    user_id: UUID
    job_id: UUID
    created_at: string
  }>
  total_count: number
  has_more: boolean
}

// Get logs for specific job
GET /api/jobs/{id}/logs?level={level}&limit=100
Response: {
  logs: Array<Log>
  container_logs_available: boolean
}

// Export logs
POST /api/internal/logs/export
Body: {
  filters: {
    level?: string
    source?: string
    from?: string
    to?: string
    search?: string
  }
  format: 'json' | 'csv' | 'txt'
}
Response: {
  export_url: string
  expires_at: string
  file_size_bytes: number
}

// Stream logs in real-time (WebSocket)
WS /api/internal/logs/stream?level={level}
Messages: {
  type: 'log_entry'
  log: Log
}
```

##### Calculation Requirements
- **Log Retention**: 30 days for PoC (configurable)
- **Log Rotation**: Archive logs older than retention period
- **Search Ranking**: Prioritize recent logs and exact matches
- **Storage Estimate**: ~100MB per day for typical PoC workload

##### Error Handling Requirements
- **Logging System Failure**: Fall back to console logging, don't crash app
- **Database Insert Failure**: Buffer logs in memory, retry after cooldown
- **Search Timeout**: Return partial results after 5s
- **Export Too Large**: Limit exports to 10,000 logs or 100MB

##### Accessibility Requirements
- Log viewer keyboard navigable
- Screen reader support for log level indicators
- High contrast mode for log levels (color-coded)
- Monospace font for log content

##### Performance Requirements (PoC Target)
- Log insertion: <10ms per log entry
- Log query: <1s for up to 10,000 logs
- Search query: <2s for full-text search
- Real-time streaming: <500ms latency
- Export generation: <10s for up to 10,000 logs

##### Analytics Requirements
```typescript
analytics.track('logs_queried', {
  log_level_filter: string,
  log_source_filter: string,
  search_query: string,
  result_count: number
})

analytics.track('logs_exported', {
  export_format: string,
  log_count: number,
  file_size_bytes: number
})

analytics.track('log_error_rate_high', {
  error_count: number,
  time_window_minutes: number,
  threshold_exceeded: boolean
})
```

---

## 10.3 Backup & Recovery

### FR 10.3.1: Database Backup Strategy (PoC)
**Description**: Implement basic database backup and recovery strategy suitable for proof-of-concept, with daily automated backups and manual backup triggers.

**Impact Weighting**: Medium (Important for data protection in PoC)

**Priority**: P2 - Medium

**Dependencies**:
- Supabase database
- SAOL integration
- Storage for backups

**User Stories**: US10.3.1

**Tasks**:
1. Configure Supabase automated daily backups
2. Implement manual backup trigger
3. Create backup verification process
4. Document recovery procedures
5. Implement backup retention policy (7 daily + 4 weekly for PoC)
6. Create restore testing procedure

**User Story Acceptance Criteria**:

#### US10.3.1: As an administrator, I need database backups to protect against data loss
- Given database contains training job data
- When automated backup runs (daily at 2 AM)
- Then full database backup is created
- And backup is verified for integrity
- And backup is stored securely
- And I can manually trigger backup before risky operations
- And I have documented recovery procedures

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- Backup tracking
CREATE TABLE database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Backup metadata
  backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('automated', 'manual', 'pre_migration')),
  backup_size_bytes BIGINT,
  backup_location TEXT NOT NULL,
  
  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_notes TEXT,
  
  -- Lifecycle
  retention_until TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_backups_type ON database_backups(backup_type, created_at);
CREATE INDEX idx_backups_retention ON database_backups(retention_until, is_deleted) WHERE is_deleted = false;
```

##### Backup Configuration
```yaml
# Backup Policy (PoC)
automated_backups:
  schedule: "0 2 * * *" # Daily at 2 AM UTC
  retention:
    daily: 7 # Keep 7 daily backups
    weekly: 4 # Keep 4 weekly backups
  
manual_backups:
  retention_days: 30

pre_migration_backups:
  retention_days: 90

backup_verification:
  enabled: true
  check_integrity: true
  check_restore_ability: false # Too resource-intensive for PoC

storage:
  provider: "supabase_storage" # For PoC
  bucket: "database-backups"
  encryption: true
```

##### UI/UX Requirements
- Backup list with status indicators
- Manual backup trigger button
- Backup verification status display
- Recovery procedure documentation link
- Backup download capability (for admins)

##### API Requirements
```typescript
// Trigger manual backup
POST /api/internal/backups/create
Body: {
  backup_type: 'manual' | 'pre_migration'
  notes?: string
}
Response: {
  backup_id: UUID
  backup_initiated: boolean
  estimated_duration_minutes: number
}

// List backups
GET /api/internal/backups?type={type}&limit=50
Response: {
  backups: Array<{
    id: UUID
    backup_type: string
    backup_size_bytes: number
    verification_status: string
    created_at: string
    retention_until: string
  }>
  total_size_bytes: number
}

// Verify backup integrity
POST /api/internal/backups/{id}/verify
Response: {
  verification_status: 'verified' | 'failed'
  verification_notes: string
  verified_at: string
}
```

##### Calculation Requirements
- **Retention Until**: 
  ```
  Daily backup: created_at + 7 days
  Weekly backup: created_at + 28 days
  Manual backup: created_at + 30 days
  Pre-migration: created_at + 90 days
  ```
- **Backup Size Estimate**: ~database_size * 0.7 (with compression)
- **Backup Duration**: ~5 minutes per GB for PoC database

##### Error Handling Requirements
- **Backup Failure**: Retry once, alert admin if second attempt fails
- **Verification Failure**: Flag backup as corrupted, trigger new backup
- **Storage Quota Exceeded**: Delete oldest expired backups, alert admin
- **Restore Failure**: Provide detailed error, manual intervention required

##### Accessibility Requirements
- Backup status announced to screen readers
- Keyboard shortcuts for manual backup trigger
- High contrast mode for status indicators

##### Performance Requirements (PoC Target)
- Backup initiation: <2s
- Backup completion: <10 minutes for typical PoC database
- Backup list query: <500ms
- Verification: <2 minutes for typical backup

##### Analytics Requirements
```typescript
analytics.track('backup_created', {
  backup_type: string,
  backup_size_bytes: number,
  backup_duration_seconds: number
})

analytics.track('backup_verification_completed', {
  backup_id: string,
  verification_status: string,
  verification_duration_seconds: number
})

analytics.track('backup_retention_policy_applied', {
  backups_deleted: number,
  space_freed_bytes: number
})
```

---

# 11. Security & Authentication Requirements

**Note**: This section focuses on proof-of-concept security requirements. No compliance frameworks (SOC2, HIPAA, GDPR) are targeted at this stage.

## 11.1 Authentication & Authorization

### FR 11.1.1: Supabase Auth Integration (PoC)
**Description**: Implement basic authentication using Supabase Auth with email/password and optional social login, suitable for proof-of-concept with small team usage.

**Impact Weighting**: High (Critical for user access control)

**Priority**: P0 - Critical

**Dependencies**:
- Supabase Auth configuration
- Team management (Section 8)
- Row Level Security policies

**User Stories**: US11.1.1, US11.1.2

**Tasks**:
1. Configure Supabase Auth with email/password provider
2. Implement user registration and login flows
3. Add password reset functionality
4. Create session management with token refresh
5. Implement basic account settings page
6. Add optional Google OAuth for convenience

**User Story Acceptance Criteria**:

#### US11.1.1: As a user, I need to create an account and log in securely
- Given I am new user
- When I register with email and password
- Then account is created in Supabase Auth
- And email confirmation is sent (optional for PoC)
- And I can log in with credentials
- And session persists across browser refreshes
- And I can log out securely

#### US11.1.2: As a user, I need to reset my password if forgotten
- Given I forgot my password
- When I request password reset
- Then I receive reset link via email
- And reset link expires after 24 hours
- And I can set new password via link
- And old sessions are invalidated after password change

**Functional Requirements Acceptance Criteria**:

##### Database Schema
```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile information
  display_name VARCHAR(200),
  avatar_url TEXT,
  
  -- Preferences
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- User sessions tracking (for security monitoring)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session details
  session_token VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Session lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX idx_sessions_token ON user_sessions(session_token) WHERE is_active = true;
```

##### Auth Configuration
```typescript
// Supabase Auth configuration (supabase dashboard)
{
  "email": {
    "enabled": true,
    "email_confirmations": false, // Disabled for PoC convenience
    "password_requirements": {
      "min_length": 8,
      "require_uppercase": false, // Relaxed for PoC
      "require_lowercase": false,
      "require_numbers": false,
      "require_special_chars": false
    }
  },
  "oauth": {
    "google": {
      "enabled": true, // Optional for convenience
      "client_id": "...",
      "client_secret": "..."
    }
  },
  "session": {
    "session_timeout": 86400, // 24 hours
    "refresh_token_rotation": true,
    "security_update_password_require_reauthentication": false // Relaxed for PoC
  }
}
```

##### UI/UX Requirements
- Login page with email/password form
- Registration page with basic validation
- Password reset request page
- Password reset confirmation page
- Account settings page (change password, update profile)
- Optional Google login button
- Session expiration warning (5 minutes before expiration)

##### API Requirements
```typescript
// Sign up (using Supabase Auth client)
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      display_name: displayName
    }
  }
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
})

// Sign out
const { error } = await supabase.auth.signOut()

// Request password reset
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`
})

// Update password
const { error } = await supabase.auth.updateUser({
  password: newPassword
})

// Get current session
const { data: { session } } = await supabase.auth.getSession()

// Refresh session
const { data, error } = await supabase.auth.refreshSession()
```

##### Calculation Requirements
- **Session Expiration**: 24 hours from login
- **Refresh Token Rotation**: New refresh token issued every 1 hour
- **Password Reset Link Expiration**: 24 hours
- **Inactive Session Timeout**: 7 days without activity

##### Error Handling Requirements
- **Invalid Credentials**: Return generic "Invalid email or password" (don't reveal which is wrong)
- **Account Locked**: Not implemented for PoC (could add after 10 failed attempts in production)
- **Session Expired**: Redirect to login, preserve intended destination
- **Password Reset Token Expired**: Clear message, offer to resend
- **Email Already Registered**: Return error, suggest password reset

##### Accessibility Requirements
- Login form keyboard accessible (Tab navigation, Enter to submit)
- Screen reader support for error messages
- High contrast mode for form inputs
- Password visibility toggle (show/hide password)
- ARIA labels for all form fields

##### Performance Requirements (PoC Target)
- Login: <1s response time
- Registration: <2s response time
- Password reset request: <1s
- Session validation: <100ms

##### Analytics Requirements
```typescript
analytics.track('user_registered', {
  user_id: string,
  registration_method: 'email' | 'google'
})

analytics.track('user_logged_in', {
  user_id: string,
  login_method: 'email' | 'google',
  session_duration_seconds: number
})

analytics.track('user_logged_out', {
  user_id: string,
  session_duration_seconds: number
})

analytics.track('password_reset_requested', {
  user_id: string
})

analytics.track('password_reset_completed', {
  user_id: string
})
```

---

### FR 11.1.2: Row Level Security (RLS) Policies (PoC)
**Description**: Implement Supabase Row Level Security policies to enforce data access control at the database level, ensuring users can only access resources they have permission to.

**Impact Weighting**: High (Critical for data security)

**Priority**: P0 - Critical

**Dependencies**:
- Supabase database
- Team memberships (FR 8.1.1)
- Artifact permissions (FR 4.3.2)
- SAOL integration (FR 9.2.1)

**User Stories**: US11.1.2

**Tasks**:
1. Enable RLS on all user-facing tables
2. Create RLS policies for training_jobs (users can only see their own or team's jobs)
3. Create RLS policies for training_artifacts (based on download permissions)
4. Create RLS policies for teams and team_memberships
5. Test RLS policies with different user roles
6. Document RLS policy patterns for future tables

**User Story Acceptance Criteria**:

#### US11.1.2: Enhanced data access control via RLS
- Given RLS is enabled on all tables
- When user queries database
- Then only authorized rows are returned
- And unauthorized access attempts return empty results (not errors)
- And RLS policies are enforced even if application has bug
- And service role can bypass RLS for admin operations (via SAOL)

**Functional Requirements Acceptance Criteria**:

##### RLS Policy Definitions
```sql
-- Enable RLS on all user-facing tables
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Training Jobs RLS Policies
CREATE POLICY "Users can view jobs they created or are team members of"
ON training_jobs FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR
  client_id IN (
    SELECT teams.client_id
    FROM team_memberships
    JOIN teams ON teams.id = team_memberships.team_id
    WHERE team_memberships.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create jobs if they are team members"
ON training_jobs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM team_memberships
    JOIN teams ON teams.id = team_memberships.team_id
    WHERE team_memberships.user_id = auth.uid()
    AND teams.client_id = training_jobs.client_id
  )
);

CREATE POLICY "Users can update jobs they created or if they have editor role"
ON training_jobs FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM team_memberships
    JOIN teams ON teams.id = team_memberships.team_id
    JOIN team_roles ON team_roles.id = team_memberships.role_id
    WHERE team_memberships.user_id = auth.uid()
    AND teams.client_id = training_jobs.client_id
    AND team_roles.can_edit_jobs = true
  )
);

CREATE POLICY "Users can delete jobs they created or if they have admin role"
ON training_jobs FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM team_memberships
    JOIN teams ON teams.id = team_memberships.team_id
    JOIN team_roles ON team_roles.id = team_memberships.role_id
    WHERE team_memberships.user_id = auth.uid()
    AND teams.client_id = training_jobs.client_id
    AND team_roles.can_delete_jobs = true
  )
);

-- Training Artifacts RLS Policies
CREATE POLICY "Users can view artifacts if they have download permission"
ON training_artifacts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM artifact_download_permissions
    WHERE artifact_download_permissions.artifact_id = training_artifacts.id
    AND (
      artifact_download_permissions.user_id = auth.uid()
      OR
      artifact_download_permissions.team_id IN (
        SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
      )
    )
    AND (artifact_download_permissions.expires_at IS NULL OR artifact_download_permissions.expires_at > NOW())
  )
  OR
  -- Artifact creator always has access
  EXISTS (
    SELECT 1
    FROM training_jobs
    WHERE training_jobs.id = training_artifacts.job_id
    AND training_jobs.created_by = auth.uid()
  )
);

-- Team Memberships RLS Policies
CREATE POLICY "Users can view team memberships for teams they belong to"
ON team_memberships FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  team_id IN (
    SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users with manage_team permission can manage memberships"
ON team_memberships FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN team_roles tr ON tr.id = tm.role_id
    WHERE tm.user_id = auth.uid()
    AND tm.team_id = team_memberships.team_id
    AND tr.can_manage_team = true
  )
);

-- Notifications RLS Policies
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR
  recipient_team_id IN (
    SELECT team_id FROM team_memberships WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update (mark as read) their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());
```

##### RLS Testing Procedure
```typescript
// Test RLS policies with different users
describe('RLS Policy Tests', () => {
  it('should prevent users from viewing other users\' jobs', async () => {
    // User A creates job
    const jobA = await createJobAsUser(userA)
    
    // User B attempts to query (should return empty, not error)
    const { data, error } = await queryJobsAsUser(userB)
    
    expect(data).not.toContain(jobA)
    expect(error).toBeNull()
  })
  
  it('should allow team members to view team jobs', async () => {
    // User A creates job for team
    const job = await createJobAsUser(userA, { teamId: teamId })
    
    // User B (team member) can view
    const { data } = await queryJobsAsUser(userB)
    
    expect(data).toContain(job)
  })
  
  it('should prevent non-admins from deleting jobs', async () => {
    const job = await createJobAsUser(userA)
    
    // User B (non-admin) attempts delete
    const { error } = await deleteJobAsUser(userB, job.id)
    
    expect(error).toBeTruthy()
    expect(error.message).toContain('permission denied')
  })
})
```

##### Calculation Requirements
- **Policy Evaluation**: Policies evaluated for every query automatically by Postgres
- **Performance Impact**: <5ms overhead per query (acceptable for PoC)

##### Error Handling Requirements
- **RLS Violation**: Return empty result set (SELECT) or permission denied error (INSERT/UPDATE/DELETE)
- **Policy Misconfiguration**: Detected during deployment migration, prevent deployment if RLS tests fail
- **Service Role Bypass**: SAOL uses service role key to bypass RLS for admin operations

##### Accessibility Requirements
- N/A (database-level security)

##### Performance Requirements (PoC Target)
- RLS policy evaluation: <5ms overhead per query
- Complex policies (multiple joins): <10ms overhead
- No noticeable performance degradation for typical queries

##### Analytics Requirements
```typescript
// Track RLS violations (unauthorized access attempts)
analytics.track('rls_violation_detected', {
  user_id: string,
  table_name: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  violation_count: number
})
```

---

## 11.2 API Security (PoC)

### FR 11.2.1: API Route Protection & Rate Limiting (PoC)
**Description**: Implement basic API route authentication and rate limiting to prevent abuse and ensure only authenticated users can access protected endpoints.

**Impact Weighting**: Medium-High (Important for API security)

**Priority**: P1 - High

**Dependencies**:
- Authentication system (FR 11.1.1)
- Next.js API routes
- Supabase Auth

**User Stories**: US11.2.1

**Tasks**:
1. Implement authentication middleware for protected routes
2. Add rate limiting per user/IP (basic tier for PoC)
3. Create API key management for webhook/external integrations
4. Implement request logging for security monitoring
5. Add CORS configuration for API routes
6. Create API error responses with appropriate status codes

**User Story Acceptance Criteria**:

#### US11.2.1: As a developer, I need protected API routes to ensure only authorized access
- Given API routes require authentication
- When unauthenticated user requests protected route
- Then request is rejected with 401 status
- And authenticated users can access routes they have permission for
- And requests are rate limited (100 requests per minute per user for PoC)
- And rate limit headers are included in responses

**Functional Requirements Acceptance Criteria**:

##### API Protection Middleware
```typescript
// Middleware for protected API routes
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function requireAuth(req: NextRequest) {
  const supabase = createMiddlewareClient({ req, res: NextResponse })
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    )
  }
  
  return { session, supabase }
}

// Usage in API route
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth // Auth failed, return error
  
  const { session, supabase } = auth
  
  // Proceed with authenticated logic
  // ...
}
```

##### Rate Limiting Implementation
```typescript
// Simple in-memory rate limiter (PoC - use Redis for production)
import { LRUCache } from 'lru-cache'

const rateLimitCache = new LRUCache<string, number>({
  max: 10000,
  ttl: 60000 // 1 minute
})

export function rateLimit(identifier: string, limit: number = 100): boolean {
  const now = Date.now()
  const key = `${identifier}:${Math.floor(now / 60000)}`
  
  const count = rateLimitCache.get(key) || 0
  
  if (count >= limit) {
    return false // Rate limit exceeded
  }
  
  rateLimitCache.set(key, count + 1)
  return true // Request allowed
}

// Usage in API route
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  
  const { session } = auth
  
  // Check rate limit
  if (!rateLimit(session.user.id, 100)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', message: 'Too many requests. Try again in 1 minute.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 60000) * 60000)
        }
      }
    )
  }
  
  // Proceed with logic
  // ...
}
```

##### API Key Management (for webhooks)
```sql
-- API keys for external integrations
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  key_name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE, -- bcrypt hash of API key
  key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification
  
  -- Permissions
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  scopes TEXT[] DEFAULT ARRAY['read'], -- 'read', 'write', 'admin'
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_team ON api_keys(team_id, is_active);
```

##### UI/UX Requirements
- API key management page (create, view, revoke)
- Rate limit warning in API documentation
- Error message display for rate limit exceeded
- API key creation wizard with scope selection

##### API Requirements
```typescript
// Create API key
POST /api/teams/{id}/api-keys
Body: {
  key_name: string
  scopes: string[]
  expires_in_days?: number
}
Response: {
  api_key_id: UUID
  api_key: string // Full key (only shown once!)
  key_prefix: string
  expires_at: string
}

// List API keys
GET /api/teams/{id}/api-keys
Response: {
  api_keys: Array<{
    id: UUID
    key_name: string
    key_prefix: string
    scopes: string[]
    is_active: boolean
    last_used_at: string
    created_at: string
  }>
}

// Revoke API key
DELETE /api/api-keys/{id}
Response: {
  success: boolean
  revoked_at: string
}
```

##### Calculation Requirements
- **Rate Limit Window**: 1 minute rolling window
- **Rate Limit Threshold**: 100 requests per minute per user (PoC)
- **API Key Expiration**: Default 90 days, max 365 days
- **Rate Limit Reset**: End of current 1-minute window

##### Error Handling Requirements
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Authenticated but insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded, include Retry-After header
- **Invalid API Key**: Return 401, don't reveal if key exists
- **Expired API Key**: Return 401 with expiration message

##### Accessibility Requirements
- N/A (API-level security)

##### Performance Requirements (PoC Target)
- Authentication check: <50ms
- Rate limit check: <10ms
- API key validation: <20ms

##### Analytics Requirements
```typescript
analytics.track('api_request_unauthorized', {
  endpoint: string,
  ip_address: string,
  user_agent: string
})

analytics.track('api_rate_limit_exceeded', {
  user_id: string,
  endpoint: string,
  limit: number
})

analytics.track('api_key_created', {
  team_id: string,
  scopes: string[],
  expires_in_days: number
})

analytics.track('api_key_revoked', {
  api_key_id: string,
  revoked_by: string
})
```

---

## 11.3 Data Security (PoC)

### FR 11.3.1: Secure Configuration Management (PoC)
**Description**: Implement secure handling of sensitive configuration values (API keys, secrets) using environment variables and Vercel/Supabase secret management.

**Impact Weighting**: Medium-High (Important for security)

**Priority**: P1 - High

**Dependencies**:
- Vercel deployment (or alternative)
- Supabase project
- RunPod API credentials

**User Stories**: US11.3.1

**Tasks**:
1. Migrate all secrets to environment variables
2. Document required environment variables
3. Implement secret validation on application startup
4. Create .env.example template
5. Add secret rotation procedure documentation
6. Implement secret access logging for audit

**User Story Acceptance Criteria**:

#### US11.3.1: As a developer, I need secure configuration management to protect sensitive data
- Given application requires API keys and secrets
- When application starts
- Then all secrets are loaded from environment variables (not hardcoded)
- And missing required secrets cause startup failure with clear error
- And secrets are not logged or exposed in client-side code
- And .env.example template is provided for local development

**Functional Requirements Acceptance Criteria**:

##### Environment Variables Configuration
```bash
# .env.example (template for developers)

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# RunPod Configuration
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_WEBHOOK_SECRET=your-webhook-secret

# Application Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Analytics (optional for PoC)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id

# Environment
NODE_ENV=development
```

##### Secret Validation on Startup
```typescript
// lib/config-validator.ts
const requiredSecrets = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RUNPOD_API_KEY',
  'NEXTAUTH_SECRET'
]

export function validateConfiguration() {
  const missingSecrets = requiredSecrets.filter(
    secret => !process.env[secret]
  )
  
  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingSecrets.join(', ')}\n` +
      `Please check your .env.local file or deployment configuration.`
    )
  }
  
  console.log('✓ Configuration validated successfully')
}

// Run during application initialization
validateConfiguration()
```

##### Secret Access Patterns
```typescript
// ✅ CORRECT: Server-side secret access
// app/api/runpod/route.ts
export async function POST(req: NextRequest) {
  const apiKey = process.env.RUNPOD_API_KEY // Server-side only
  
  const response = await fetch('https://api.runpod.io/...', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })
}

// ❌ INCORRECT: Exposing secrets in client components
'use client'
export function ClientComponent() {
  const apiKey = process.env.RUNPOD_API_KEY // DON'T DO THIS!
  // This would expose the secret in browser
}

// ✅ CORRECT: Client-safe public values only
'use client'
export function ClientComponent() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL // OK (prefixed with NEXT_PUBLIC_)
}
```

##### Secret Rotation Procedure (Documentation)
```markdown
# Secret Rotation Procedure (PoC)

## Supabase Service Role Key
1. Generate new service role key in Supabase dashboard
2. Update SUPABASE_SERVICE_ROLE_KEY in Vercel deployment
3. Trigger redeployment
4. Verify application functionality
5. Revoke old key in Supabase dashboard

## RunPod API Key
1. Generate new API key in RunPod dashboard
2. Update RUNPOD_API_KEY in Vercel deployment
3. Trigger redeployment
4. Verify training job provisioning works
5. Revoke old key in RunPod dashboard

## Rotation Schedule (PoC)
- Supabase keys: Every 90 days
- RunPod keys: Every 90 days
- Webhook secrets: Every 180 days
```

##### Calculation Requirements
- **Secret Validation**: All required secrets must be present at startup
- **Secret Rotation Schedule**: 90 days for API keys (PoC guideline)

##### Error Handling Requirements
- **Missing Secret**: Fail startup immediately with clear error message
- **Invalid Secret Format**: Validate and fail startup if format incorrect
- **Secret Exposure in Logs**: Never log secret values, log only "***" or key prefix

##### Accessibility Requirements
- N/A (configuration management)

##### Performance Requirements (PoC Target)
- Configuration validation: <100ms at startup

##### Analytics Requirements
```typescript
// DO NOT track actual secret values!
analytics.track('configuration_validated', {
  environment: 'development' | 'production',
  secrets_count: number,
  validation_duration_ms: number
})

// Log secret access for audit (without values)
analytics.track('secret_accessed', {
  secret_name: string, // e.g., 'RUNPOD_API_KEY'
  accessed_by: string, // Function/route name
  access_context: string
})
```

---

# Document Summary

This Part B document provides comprehensive functional requirements for:

**Section 4: Model Artifacts & Downloads** (7 FRs)
- Artifact storage structure with hierarchical organization
- Comprehensive metadata management and search
- Intelligent checkpoint handling with differential storage
- Checkpoint quality evaluation integration
- Secure download system with access control
- Granular artifact permissions
- Integration with Supabase Storage via SAOL

**Section 5: Training Comparison & Optimization** (4 FRs)
- Multi-run comparison dashboard with statistical analysis
- Hyperparameter impact analysis and recommendations
- Cost-quality trade-off analysis with Pareto optimization
- Automated optimization recommendations with ML

**Section 8: Team Collaboration & Notifications** (6 FRs)
- Role-based access control with hierarchical permissions
- Team invitation and onboarding workflow
- Multi-channel notification delivery (email, in-app, webhook)
- Event subscription management
- Team activity timeline with real-time updates

**Section 9: System Integration Requirements** (4 FRs)
- RunPod API integration with robust error handling
- Docker container management for training workloads
- SAOL (Supabase Agent Ops Library) mandatory usage
- Supabase Storage integration with lifecycle management

**Section 10: Operational Requirements** (5 FRs)
- Application performance monitoring (APM)
- Training job health monitoring with automatic recovery
- Centralized logging system with search and export
- Database backup strategy suitable for PoC

**Section 11: Security & Authentication Requirements** (3 FRs)
- Supabase Auth integration with email/password and optional OAuth
- Row Level Security (RLS) policies for data access control
- API route protection with rate limiting
- Secure configuration management

## Cross-References to Part A

This Part B document extensively references Part A sections for dependencies:

- **Section 1 (Training Job Lifecycle)**: Referenced in artifact management, job health monitoring, RunPod integration
- **Section 2 (Quality Validation)**: Referenced in checkpoint quality evaluation, comparison analysis
- **Section 6 (Cost Management)**: Referenced in RunPod provisioning, cost-quality trade-offs, artifact storage

## Operational Maturity Target

All functional requirements in this document are scoped for **Proof of Concept (PoC)** operational maturity:

- Simplified authentication (no MFA, relaxed password requirements)
- Basic rate limiting (in-memory, not distributed)
- 30-day log retention
- 7-day backup retention
- No compliance frameworks (SOC2, HIPAA, GDPR)
- Manual procedures acceptable for rare operations
- Monitoring suitable for small team usage
- No high-availability requirements

## Next Steps

1. Review both Part A and Part B for completeness
2. Integrate sections during implementation phase
3. Resolve any overlaps or conflicts between parts
4. Create unified implementation roadmap
5. Prioritize P0 (Critical) requirements for initial development

---

**Document Status**: Complete
**Version**: 1.0
**Last Updated**: December 17, 2025
