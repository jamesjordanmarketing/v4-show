# Pipeline Implementation - Section E03: UI Components & Pages

**Version:** 1.0  
**Date:** January 10, 2026  
**Section:** E03 - User Interface Layer  
**Prerequisites:** E01 (Database Schema), E02 (API Routes) must be complete  
**Builds Upon:** E01 types, E02 API routes, stores, and hooks  

---

## Overview

This prompt creates the UI components and pages for the pipeline module. The UI follows a **lay-person accessible** design with business-impact terminology instead of technical jargon.

**What This Section Creates:**
1. Pipeline UI components (8 components)
2. Pipeline pages (4 pages)
3. UI integration with existing dashboard layout

**What This Section Does NOT Create:**
- Training engine implementation (E04)
- Claude-as-Judge evaluation system (E04)

---

## Critical Instructions

### UI Design Principles

Based on `LoRA-training-lay-person-interface-changes_v3.md`:

1. **Lay-Person Language**: Use business-impact terms, not technical terms
   - "Learning Rate" → "Training Sensitivity"
   - "Batch Size" → "Training Progression"  
   - "Epochs" → "Training Repetition"

2. **Single Engine Architecture**: No engine selection UI
   - Display engine features as read-only
   - No dropdown or selection mechanism

3. **Post-Training Metrics**: Specialized metrics shown ONLY in results
   - Not in configuration (E08) or monitoring (E09)
   - Display in results dashboard (E10) only

4. **Rollover Tooltips**: Explain tradeoffs in plain language

### SAOL for Database Operations

Use SAOL for any database operations needed in components:

```bash
cd "c:/Users/james/Master/BrightHub/BRun/v4-show/supa-agent-ops" && node -e "require('dotenv').config({path:'../.env.local'});const saol=require('.');(async()=>{const r=await saol.agentQuery({table:'datasets',select:'id,name,status',limit:10});console.log(JSON.stringify(r.data,null,2));})();"
```

### Codebase Integration

**Target Codebase:** `C:\Users\james\Master\BrightHub\BRun\v4-show\src`

**Follow existing UI patterns from:**
- `src/components/` - Component structure
- `src/app/(dashboard)/` - Page structure with dashboard layout
- Use Shadcn/UI components from `src/components/ui/`
- Use Tailwind CSS for styling

**Do NOT break existing functionality.** Add new components and pages.

---

## Reference Documents

- Full Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\v4-show-full-implementation-spec_v1.md`
- Lay-Person Interface Spec: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\workfiles\LoRA-training-lay-person-interface-changes_v3.md`
- FIGMA Wireframe: `C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\product\_mapping\pipeline\figma-combined\04b-FIGMA-combined-prompt-E08-output_v2.md`
- VITE Reference: `C:\Users\james\Master\BrightHub\BRun\v4-show\engine-v2\src\app\pages\TrainingConfigurationPage.tsx`

Uses from E01/E02:
- `src/types/pipeline.ts`
- `src/stores/pipelineStore.ts`
- `src/hooks/usePipelineJobs.ts`

---

## Implementation Tasks

### Task 1: Create UI Components

Create directory: `src/components/pipeline/`

#### 1.1 Training Data Summary Card

Create file: `src/components/pipeline/TrainingDataSummaryCard.tsx`

```tsx
/**
 * Training Data Summary Card
 * 
 * Displays selected training file information at top of configuration
 */

'use client';

import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TrainingDataSummaryProps {
  fileName: string | null;
  conversationCount?: number;
  trainingPairsCount?: number;
  isReady: boolean;
  onSelectFile: () => void;
}

export function TrainingDataSummaryCard({
  fileName,
  conversationCount = 0,
  trainingPairsCount = 0,
  isReady,
  onSelectFile,
}: TrainingDataSummaryProps) {
  if (!fileName) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your Training Data</h3>
                <p className="text-muted-foreground">
                  No training file selected. Select a file to begin configuration.
                </p>
              </div>
            </div>
            <Button onClick={onSelectFile}>
              Select Training File
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isReady ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              isReady ? 'bg-green-100 dark:bg-green-900' : 'bg-amber-100 dark:bg-amber-900'
            }`}>
              {isReady ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Your Training Data</h3>
              <p className="text-muted-foreground">{fileName}</p>
              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                <span>{conversationCount} conversations</span>
                <span>•</span>
                <span>{trainingPairsCount} training examples</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={onSelectFile}>
            Change File
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 1.2 Training Parameter Slider

Create file: `src/components/pipeline/TrainingParameterSlider.tsx`

```tsx
/**
 * Training Parameter Slider
 * 
 * Slider component with lay-person labels and rollover tooltips
 */

'use client';

import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SliderOption {
  value: string | number;
  display: string;
}

interface TrainingParameterSliderProps {
  id: string;
  label: string;
  description: string;
  tooltipContent: {
    explanation: string;
    lowImpact: string;
    highImpact: string;
    technicalNote?: string;
  };
  options: SliderOption[];
  value: string | number;
  onChange: (value: string | number) => void;
}

export function TrainingParameterSlider({
  id,
  label,
  description,
  tooltipContent,
  options,
  value,
  onChange,
}: TrainingParameterSliderProps) {
  const currentIndex = options.findIndex((opt) => opt.value === value);
  const currentOption = options[currentIndex] || options[Math.floor(options.length / 2)];

  const handleSliderChange = (values: number[]) => {
    const newIndex = values[0];
    if (options[newIndex]) {
      onChange(options[newIndex].value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-base font-medium">
            {label}
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm p-4">
                <div className="space-y-2">
                  <p className="font-medium">{label}</p>
                  <p className="text-sm">{tooltipContent.explanation}</p>
                  <div className="border-t pt-2 mt-2 space-y-1 text-sm">
                    <p><strong>Lower settings:</strong> {tooltipContent.lowImpact}</p>
                    <p><strong>Higher settings:</strong> {tooltipContent.highImpact}</p>
                  </div>
                  {tooltipContent.technicalNote && (
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Technical: {tooltipContent.technicalNote}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-medium text-primary">
          {currentOption.display}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{description}</p>

      <Slider
        id={id}
        min={0}
        max={options.length - 1}
        step={1}
        value={[currentIndex >= 0 ? currentIndex : Math.floor(options.length / 2)]}
        onValueChange={handleSliderChange}
        className="w-full"
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{options[0]?.display}</span>
        <span>{options[options.length - 1]?.display}</span>
      </div>
    </div>
  );
}
```

#### 1.3 Engine Features Panel

Create file: `src/components/pipeline/EngineFeaturesPanel.tsx`

```tsx
/**
 * Engine Features Panel
 * 
 * Display-only panel showing features of the currently loaded engine
 * No interactive elements - single engine architecture
 */

'use client';

import { Cpu, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EngineFeature, TrainingEngine } from '@/types/pipeline';

interface EngineFeaturesPanelProps {
  engine: TrainingEngine;
}

export function EngineFeaturesPanel({ engine }: EngineFeaturesPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Training Engine Features</CardTitle>
          </div>
          <Badge variant="secondary">{engine.name}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {engine.description}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {engine.features.map((feature) => (
            <div
              key={feature.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{feature.name}</p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 italic">
          These features are automatically applied during training. No configuration needed.
        </p>
      </CardContent>
    </Card>
  );
}
```

#### 1.4 Post-Training Evaluation Info

Create file: `src/components/pipeline/PostTrainingEvaluationInfo.tsx`

```tsx
/**
 * Post-Training Evaluation Info
 * 
 * Display-only panel showing automatic evaluations that will run after training
 */

'use client';

import { BeakerIcon, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AutomaticEvaluation } from '@/types/pipeline';

interface PostTrainingEvaluationInfoProps {
  evaluations: AutomaticEvaluation[];
}

export function PostTrainingEvaluationInfo({ evaluations }: PostTrainingEvaluationInfoProps) {
  const totalTime = evaluations.reduce((sum, e) => sum + e.estimatedMinutes, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BeakerIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Automatic Quality Evaluation</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          After training completes, these evaluations will run automatically to measure quality.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {evaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-medium text-sm">{evaluation.name}</p>
                <p className="text-sm text-muted-foreground">{evaluation.description}</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>~{evaluation.estimatedMinutes}m</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total evaluation time</span>
          <span className="font-medium">~{totalTime} minutes</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 1.5 Cost Estimate Card

Create file: `src/components/pipeline/CostEstimateCard.tsx`

```tsx
/**
 * Cost Estimate Card
 * 
 * Real-time cost calculation based on configuration
 */

'use client';

import { DollarSign, Timer, Cpu, BeakerIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CostEstimateCardProps {
  computeCost: number;
  evaluationCost: number;
  totalCost: number;
  estimatedDuration: string;
  gpuType?: string;
}

export function CostEstimateCard({
  computeCost,
  evaluationCost,
  totalCost,
  estimatedDuration,
  gpuType = 'NVIDIA A40',
}: CostEstimateCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Estimated Cost</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total cost - prominent */}
          <div className="text-center py-4 border-b">
            <p className="text-4xl font-bold text-primary">
              ${totalCost.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total estimated cost</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Training Compute</span>
              </div>
              <span className="text-sm font-medium">${computeCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BeakerIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Quality Evaluation</span>
              </div>
              <span className="text-sm font-medium">${evaluationCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Duration and GPU */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>Estimated Duration</span>
              </div>
              <span className="font-medium">{estimatedDuration}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>GPU Type</span>
              <span>{gpuType}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 1.6 Training Progress Panel

Create file: `src/components/pipeline/TrainingProgressPanel.tsx`

```tsx
/**
 * Training Progress Panel
 * 
 * Real-time progress display during training
 */

'use client';

import { Activity, Clock, TrendingDown, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PipelineTrainingJob, PipelineJobStatus } from '@/types/pipeline';

interface TrainingProgressPanelProps {
  job: PipelineTrainingJob;
}

const STATUS_COLORS: Record<PipelineJobStatus, string> = {
  pending: 'bg-yellow-500',
  queued: 'bg-yellow-500',
  initializing: 'bg-blue-500',
  running: 'bg-green-500',
  completed: 'bg-green-600',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const STATUS_LABELS: Record<PipelineJobStatus, string> = {
  pending: 'Pending',
  queued: 'In Queue',
  initializing: 'Initializing',
  running: 'Training',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function TrainingProgressPanel({ job }: TrainingProgressPanelProps) {
  const isActive = ['pending', 'queued', 'initializing', 'running'].includes(job.status);
  
  // Calculate elapsed time
  const elapsedMs = job.startedAt 
    ? Date.now() - new Date(job.startedAt).getTime() 
    : 0;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;
  const elapsedDisplay = elapsedHours > 0 
    ? `${elapsedHours}h ${remainingMinutes}m` 
    : `${elapsedMinutes}m`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${isActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
            <CardTitle className="text-lg">Training Progress</CardTitle>
          </div>
          <Badge className={STATUS_COLORS[job.status]}>
            {STATUS_LABELS[job.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Epoch {job.currentEpoch}/{job.epochs}</span>
              <span>Step {job.currentStep}/{job.totalSteps || '?'}</span>
            </div>
          </div>

          {/* Real-time metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Current Loss</span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {job.currentLoss?.toFixed(4) || '--'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Tokens/sec</span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {job.tokensPerSecond?.toFixed(0) || '--'}
              </p>
            </div>
          </div>

          {/* Time info */}
          <div className="flex items-center justify-between text-sm border-t pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Elapsed Time</span>
            </div>
            <span className="font-medium">{elapsedDisplay}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 1.7 Training Quality Evaluation Card

Create file: `src/components/pipeline/TrainingQualityEvaluation.tsx`

```tsx
/**
 * Training Quality Evaluation Card
 * 
 * Displays specialized metrics (Emotional Arc Fidelity, Empathy Score) 
 * shown ONLY in results dashboard (E10), not in configuration or monitoring
 */

'use client';

import { Star, TrendingUp, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ComparisonMetric } from '@/types/pipeline-evaluation';

interface TrainingQualityEvaluationProps {
  arcCompletionRate: ComparisonMetric;
  empathyFirstRate: ComparisonMetric;
  voiceConsistency: ComparisonMetric;
  overallScore: ComparisonMetric;
}

function MetricRow({
  icon: Icon,
  label,
  metric,
  format = 'percent',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  metric: ComparisonMetric;
  format?: 'percent' | 'score';
}) {
  const value = metric.trained;
  const displayValue = format === 'percent' 
    ? `${(value * 100).toFixed(0)}%` 
    : value.toFixed(1);
  const improvement = metric.absoluteImprovement;
  const improvementDisplay = format === 'percent'
    ? `+${(improvement * 100).toFixed(0)}%`
    : `+${improvement.toFixed(1)}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{displayValue}</span>
          {improvement > 0 && (
            <Badge variant="secondary" className="text-xs text-green-600 bg-green-100">
              {improvementDisplay}
            </Badge>
          )}
          {metric.meetsTarget && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Progress 
            value={format === 'percent' ? value * 100 : (value / 5) * 100} 
            className="h-2"
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Baseline: {format === 'percent' 
          ? `${(metric.baseline * 100).toFixed(0)}%` 
          : metric.baseline.toFixed(1)}</span>
        <span>Improvement: {(metric.percentImprovement * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function TrainingQualityEvaluation({
  arcCompletionRate,
  empathyFirstRate,
  voiceConsistency,
  overallScore,
}: TrainingQualityEvaluationProps) {
  const allMet = arcCompletionRate.meetsTarget && 
                 empathyFirstRate.meetsTarget && 
                 voiceConsistency.meetsTarget;

  return (
    <Card className={allMet ? 'border-green-500/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Training Quality Evaluation</CardTitle>
          {allMet && (
            <Badge className="bg-green-500">All Targets Met</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Claude-as-Judge evaluation comparing trained model to baseline
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <MetricRow
          icon={TrendingUp}
          label="Arc Completion Rate"
          metric={arcCompletionRate}
          format="percent"
        />
        <MetricRow
          icon={Heart}
          label="Empathy First Rate"
          metric={empathyFirstRate}
          format="percent"
        />
        <MetricRow
          icon={MessageCircle}
          label="Voice Consistency"
          metric={voiceConsistency}
          format="percent"
        />
        <MetricRow
          icon={Star}
          label="Overall Score"
          metric={overallScore}
          format="score"
        />
      </CardContent>
    </Card>
  );
}
```

#### 1.8 Component Index

Create file: `src/components/pipeline/index.ts`

```typescript
export { TrainingDataSummaryCard } from './TrainingDataSummaryCard';
export { TrainingParameterSlider } from './TrainingParameterSlider';
export { EngineFeaturesPanel } from './EngineFeaturesPanel';
export { PostTrainingEvaluationInfo } from './PostTrainingEvaluationInfo';
export { CostEstimateCard } from './CostEstimateCard';
export { TrainingProgressPanel } from './TrainingProgressPanel';
export { TrainingQualityEvaluation } from './TrainingQualityEvaluation';
```

### Task 2: Create Pages

#### 2.1 Create Pipeline Configuration Page

Create directory and file: `src/app/(dashboard)/pipeline/configure/page.tsx`

```tsx
/**
 * Pipeline Configuration Page (E08)
 * 
 * Lay-person accessible training configuration
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TrainingDataSummaryCard,
  TrainingParameterSlider,
  EngineFeaturesPanel,
  PostTrainingEvaluationInfo,
  CostEstimateCard,
} from '@/components/pipeline';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useCreatePipelineJob } from '@/hooks/usePipelineJobs';
import {
  SENSITIVITY_OPTIONS,
  PROGRESSION_OPTIONS,
  REPETITION_OPTIONS,
} from '@/types/pipeline';

// Tooltip content for lay-person sliders
const SENSITIVITY_TOOLTIP = {
  explanation: 'Controls how quickly your AI adapts to your training examples.',
  lowImpact: 'Slower learning, very stable. Good for refining existing behavior.',
  highImpact: 'Faster learning, more reactive. Good for teaching new behaviors.',
  technicalNote: 'Maps to learning rate (0.00001 - 0.001)',
};

const PROGRESSION_TOOLTIP = {
  explanation: 'Controls how deeply the AI analyzes each example before moving on.',
  lowImpact: 'More thorough analysis per example, slower overall. Best for complex conversations.',
  highImpact: 'Broader pattern recognition, faster overall. Best for varied training data.',
  technicalNote: 'Maps to batch size (2 - 16)',
};

const REPETITION_TOOLTIP = {
  explanation: 'How many times the AI reviews all your training examples.',
  lowImpact: 'Quick training, good for testing. May not fully learn patterns.',
  highImpact: 'Thorough training, better retention. Takes longer and costs more.',
  technicalNote: 'Maps directly to training epochs',
};

export default function PipelineConfigurePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    selectedFileId,
    selectedFileName,
    trainingSensitivity,
    trainingProgression,
    trainingRepetition,
    jobName,
    setSelectedFile,
    setTrainingSensitivity,
    setTrainingProgression,
    setTrainingRepetition,
    setJobName,
    getCostEstimate,
    isConfigurationValid,
    getEngine,
  } = usePipelineStore();

  const createJob = useCreatePipelineJob();
  const costEstimate = getCostEstimate();
  const engine = getEngine();
  const isValid = isConfigurationValid();

  const handleSelectFile = () => {
    // In production, this would open a file selection modal
    // For now, simulate with a mock file
    setSelectedFile('mock-dataset-id', 'Elena_Emotional_Training_v4.json');
  };

  const handleSubmit = async () => {
    if (!isValid || !selectedFileId) return;
    
    setIsSubmitting(true);
    try {
      const result = await createJob.mutateAsync({
        jobName,
        datasetId: selectedFileId,
        trainingSensitivity,
        trainingProgression,
        trainingRepetition,
      });
      
      if (result.success && result.data) {
        router.push(`/pipeline/jobs/${result.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configure Training</h1>
        <p className="text-muted-foreground mt-2">
          Set up your AI training job with your emotional intelligence training data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main configuration - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Training Data */}
          <TrainingDataSummaryCard
            fileName={selectedFileName}
            conversationCount={24}
            trainingPairsCount={153}
            isReady={!!selectedFileId}
            onSelectFile={handleSelectFile}
          />

          {/* Job Name */}
          <div className="space-y-2">
            <Label htmlFor="jobName">Training Job Name</Label>
            <Input
              id="jobName"
              placeholder="e.g., Emotional Intelligence v1.0"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
            />
          </div>

          {/* Training Parameters */}
          <div className="space-y-8 p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-semibold">Training Settings</h2>
            
            <TrainingParameterSlider
              id="sensitivity"
              label="Training Sensitivity"
              description="How quickly your AI learns from examples"
              tooltipContent={SENSITIVITY_TOOLTIP}
              options={SENSITIVITY_OPTIONS}
              value={trainingSensitivity}
              onChange={(v) => setTrainingSensitivity(v as any)}
            />

            <TrainingParameterSlider
              id="progression"
              label="Training Progression"
              description="How deeply each example is analyzed"
              tooltipContent={PROGRESSION_TOOLTIP}
              options={PROGRESSION_OPTIONS}
              value={trainingProgression}
              onChange={(v) => setTrainingProgression(v as any)}
            />

            <TrainingParameterSlider
              id="repetition"
              label="Training Repetition"
              description="How many times all examples are reviewed"
              tooltipContent={REPETITION_TOOLTIP}
              options={REPETITION_OPTIONS}
              value={trainingRepetition}
              onChange={(v) => setTrainingRepetition(v as any)}
            />
          </div>

          {/* Engine Features (display only) */}
          <EngineFeaturesPanel engine={engine} />

          {/* Automatic Evaluations (display only) */}
          <PostTrainingEvaluationInfo evaluations={engine.evaluations} />
        </div>

        {/* Sidebar - Cost estimate and submit */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-6">
            <CostEstimateCard
              computeCost={costEstimate.computeCost}
              evaluationCost={costEstimate.evaluationCost}
              totalCost={costEstimate.totalCost}
              estimatedDuration={costEstimate.estimatedDuration}
            />

            <Button
              size="lg"
              className="w-full"
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Starting Training...' : 'Start Training'}
            </Button>

            {!isValid && (
              <p className="text-sm text-muted-foreground text-center">
                Select a training file and enter a job name to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2.2 Create Pipeline Jobs List Page

Create file: `src/app/(dashboard)/pipeline/jobs/page.tsx`

```tsx
/**
 * Pipeline Jobs List Page
 * 
 * Shows all user's pipeline training jobs
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePipelineJobs } from '@/hooks/usePipelineJobs';
import { PipelineJobStatus } from '@/types/pipeline';

const STATUS_ICONS: Record<PipelineJobStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  queued: <Clock className="h-4 w-4 text-yellow-500" />,
  initializing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  running: <Loader2 className="h-4 w-4 text-green-500 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-500" />,
};

export default function PipelineJobsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading, error } = usePipelineJobs({ 
    limit: 20,
    status: statusFilter 
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Training Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your AI training jobs
          </p>
        </div>
        <Link href="/pipeline/configure">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Training Job
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">
          Failed to load jobs. Please try again.
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-medium mb-2">No training jobs yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first training job to get started
          </p>
          <Link href="/pipeline/configure">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Training Job
            </Button>
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Job Name</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[job.status]}
                    <span className="capitalize">{job.status}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{job.jobName}</TableCell>
                <TableCell>
                  {job.status === 'running' ? (
                    <span>{job.progress}%</span>
                  ) : job.status === 'completed' ? (
                    <Badge variant="secondary">Complete</Badge>
                  ) : (
                    '--'
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(job.createdAt)}
                </TableCell>
                <TableCell>
                  ${(job.actualCost || job.estimatedCost || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Link href={`/pipeline/jobs/${job.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

#### 2.3 Create Job Detail/Monitoring Page

Create file: `src/app/(dashboard)/pipeline/jobs/[jobId]/page.tsx`

```tsx
/**
 * Pipeline Job Detail Page (E09)
 * 
 * Real-time monitoring of training job progress
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrainingProgressPanel } from '@/components/pipeline';
import { usePipelineJob, useCancelPipelineJob } from '@/hooks/usePipelineJobs';

export default function PipelineJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  
  const { data, isLoading, error } = usePipelineJob(jobId);
  const cancelJob = useCancelPipelineJob();
  
  const job = data?.data;
  const isActive = job && ['pending', 'queued', 'initializing', 'running'].includes(job.status);
  const isComplete = job?.status === 'completed';

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this training job?')) return;
    
    try {
      await cancelJob.mutateAsync(jobId);
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-16">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This training job doesn't exist or you don't have access.
          </p>
          <Link href="/pipeline/jobs">
            <Button variant="outline">Back to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/pipeline/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{job.jobName}</h1>
          <p className="text-muted-foreground">
            Created {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
        {isActive && (
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={cancelJob.isPending}
          >
            Cancel Training
          </Button>
        )}
        {isComplete && (
          <Link href={`/pipeline/jobs/${jobId}/results`}>
            <Button>View Results</Button>
          </Link>
        )}
      </div>

      {/* Progress Panel */}
      <TrainingProgressPanel job={job} />

      {/* Configuration Summary */}
      <div className="mt-8 p-6 rounded-lg border bg-card">
        <h2 className="text-lg font-semibold mb-4">Configuration Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Training Sensitivity</p>
            <p className="font-medium capitalize">{job.trainingSensitivity.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Training Progression</p>
            <p className="font-medium capitalize">{job.trainingProgression}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Training Repetition</p>
            <p className="font-medium">{job.trainingRepetition} epochs</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dataset</p>
            <p className="font-medium">{job.datasetName || '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Engine</p>
            <p className="font-medium">{job.engineName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">GPU</p>
            <p className="font-medium">{job.gpuType}</p>
          </div>
        </div>
      </div>

      {/* Error display */}
      {job.status === 'failed' && job.errorMessage && (
        <div className="mt-8 p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Training Failed
          </h2>
          <p className="text-red-600 dark:text-red-300">{job.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
```

#### 2.4 Create Results Dashboard Page

Create file: `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx`

```tsx
/**
 * Pipeline Results Dashboard Page (E10)
 * 
 * Displays training results including specialized metrics
 * from Claude-as-Judge evaluation
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrainingQualityEvaluation } from '@/components/pipeline';
import { usePipelineJob } from '@/hooks/usePipelineJobs';

// Mock evaluation data - in production, fetch from API
const MOCK_EVALUATION = {
  arcCompletionRate: {
    baseline: 0.28,
    trained: 0.52,
    absoluteImprovement: 0.24,
    percentImprovement: 0.857,
    meetsTarget: true,
  },
  empathyFirstRate: {
    baseline: 0.45,
    trained: 0.88,
    absoluteImprovement: 0.43,
    percentImprovement: 0.956,
    meetsTarget: true,
  },
  voiceConsistency: {
    baseline: 0.65,
    trained: 0.92,
    absoluteImprovement: 0.27,
    percentImprovement: 0.415,
    meetsTarget: true,
  },
  overallScore: {
    baseline: 2.8,
    trained: 4.2,
    absoluteImprovement: 1.4,
    percentImprovement: 0.50,
    meetsTarget: true,
  },
};

export default function PipelineResultsPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  
  const { data, isLoading } = usePipelineJob(jobId);
  const job = data?.data;

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!job || job.status !== 'completed') {
    return (
      <div className="container max-w-5xl py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
          <p className="text-muted-foreground mb-4">
            Training must be complete to view results.
          </p>
          <Link href={`/pipeline/jobs/${jobId}`}>
            <Button variant="outline">Back to Job</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/pipeline/jobs/${jobId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{job.jobName}</h1>
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Completed {job.completedAt && new Date(job.completedAt).toLocaleString()}
          </p>
        </div>
        {job.adapterDownloadUrl && (
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download Adapter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Training Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Training Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Final Loss</p>
                <p className="text-2xl font-bold">{job.finalLoss?.toFixed(4) || '--'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Training Time</p>
                <p className="text-2xl font-bold">
                  {job.trainingTimeSeconds 
                    ? `${Math.floor(job.trainingTimeSeconds / 60)}m ${job.trainingTimeSeconds % 60}s`
                    : '--'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Steps</p>
                <p className="text-2xl font-bold">{job.totalSteps || '--'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Cost</p>
                <p className="text-2xl font-bold">
                  ${(job.actualCost || job.estimatedCost || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Files */}
        <Card>
          <CardHeader>
            <CardTitle>Model Files</CardTitle>
          </CardHeader>
          <CardContent>
            {job.adapterDownloadUrl ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium">LoRA Adapter</p>
                  <p className="text-sm text-muted-foreground">
                    adapter_model.safetensors
                  </p>
                </div>
                <Button className="w-full" asChild>
                  <a href={job.adapterDownloadUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download Adapter Files
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Adapter files are being prepared...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quality Evaluation - Specialized Metrics */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Training Quality Evaluation</h2>
        <TrainingQualityEvaluation {...MOCK_EVALUATION} />
      </div>

      {/* Traceability */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Traceability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Job ID</p>
              <p className="font-mono">{job.id.slice(0, 8)}...</p>
            </div>
            <div>
              <p className="text-muted-foreground">Engine</p>
              <p>{job.engineId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dataset</p>
              <p>{job.datasetName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">RunPod Job</p>
              <p className="font-mono">{job.runpodJobId?.slice(0, 8) || '--'}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Task 3: Add Navigation Link

Update the dashboard navigation to include Pipeline link. Find the navigation component and add:

```tsx
// Add to navigation items array
{
  href: '/pipeline/configure',
  label: 'Pipeline',
  icon: Cpu, // from lucide-react
}
```

### Task 4: Verify Implementation

```bash
# Start dev server
cd "c:/Users/james/Master/BrightHub/BRun/v4-show" && npm run dev

# Navigate to pages in browser:
# - http://localhost:3000/pipeline/configure
# - http://localhost:3000/pipeline/jobs

# Verify TypeScript compilation
npx tsc --noEmit
```

---

## Success Criteria

- [ ] All 8 UI components render correctly
- [ ] All 4 pages load without errors
- [ ] Lay-person terminology used throughout
- [ ] Sliders have working tooltips
- [ ] Engine features display as read-only
- [ ] Cost estimate updates dynamically
- [ ] Job creation flow works end-to-end
- [ ] Existing UI functionality not broken

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/pipeline/TrainingDataSummaryCard.tsx` | Training file display |
| `src/components/pipeline/TrainingParameterSlider.tsx` | Lay-person sliders |
| `src/components/pipeline/EngineFeaturesPanel.tsx` | Engine display |
| `src/components/pipeline/PostTrainingEvaluationInfo.tsx` | Evaluation info |
| `src/components/pipeline/CostEstimateCard.tsx` | Cost display |
| `src/components/pipeline/TrainingProgressPanel.tsx` | Progress monitoring |
| `src/components/pipeline/TrainingQualityEvaluation.tsx` | Results metrics |
| `src/components/pipeline/index.ts` | Component exports |
| `src/app/(dashboard)/pipeline/configure/page.tsx` | Configuration page |
| `src/app/(dashboard)/pipeline/jobs/page.tsx` | Jobs list page |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/page.tsx` | Job detail page |
| `src/app/(dashboard)/pipeline/jobs/[jobId]/results/page.tsx` | Results page |

---

## Next Section

After completing E03, proceed to:
**Section E04: Training Engine & Evaluation System**

E04 will implement the RunPod training engine and Claude-as-Judge evaluation.

---

**END OF E03 PROMPT**
