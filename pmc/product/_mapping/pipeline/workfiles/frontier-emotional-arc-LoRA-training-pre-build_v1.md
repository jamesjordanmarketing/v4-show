# Emotional Arc LoRA Training Engine: Pre-Build Specification

**Version:** 1.0
**Date:** January 10, 2026
**Purpose:** Complete specification for data preparation and Axolotl integration
**Audience:** Coding agents building the training engine
**Prerequisites:** None - this document is self-contained

---

## 1. Executive Overview

This specification defines how to build the training engine component of the BrightRun Pipeline module. The engine will:

1. **Transform** source training data (BrightRun LoRA v4 JSON format) into Axolotl-compatible format
2. **Integrate** Axolotl as the training framework via API/CLI
3. **Execute** LoRA training on RunPod H100 infrastructure
4. **Store** and manage trained adapters for deployment

**Core Principle:** The training is standard supervised fine-tuning (SFT). The value is in the DATA, not custom training algorithms. We use industry-standard tools (Axolotl) rather than building custom training infrastructure.

---

## 2. Source Data Specification

### 2.1 Source File Location

```
Primary training file:
C:\Users\james\Master\BrightHub\BRun\v4-show\pmc\_archive\full-file-training-json-12-plus-12-added-conversations.json

Future training files will follow same format.
```

### 2.2 Source Data Schema (BrightRun LoRA v4)

```typescript
interface BrightRunTrainingFile {
  training_file_metadata: {
    file_name: string;
    version: string;  // "4.0.0"
    created_date: string;
    last_updated: string;
    format_spec: "brightrun-lora-v4";
    target_model: string;  // "claude-sonnet-4-5" (for generation, not training)
    vertical: string;  // "financial_planning_consultant"
    total_conversations: number;
    total_training_pairs: number;
    quality_summary: {
      avg_quality_score: number;  // 1-5
      min_quality_score: number;
      max_quality_score: number;
      human_reviewed_count: number;
      human_reviewed_percentage: number;
    };
    scaffolding_distribution: {
      personas: Record<string, number>;
      emotional_arcs: Record<string, number>;
      training_topics: Record<string, number>;
    };
  };

  consultant_profile: {
    name: string;  // "Elena Morales, CFP"
    business: string;
    expertise: string;
    years_experience: number;
    core_philosophy: Record<string, string>;
    communication_style: {
      tone: string;
      techniques: string[];
      avoid: string[];
    };
  };

  conversations: Conversation[];
}

interface Conversation {
  conversation_metadata: {
    conversation_id: string;
    source_file: string;
    created_date: string;
    total_turns: number;
    quality_tier: string;
    scaffolding: {
      persona_key: string;
      persona_name: string;
      emotional_arc_key: string;
      emotional_arc: string;
      training_topic_key: string;
      training_topic: string;
    };
  };
  training_pairs: TrainingPair[];
}

interface TrainingPair {
  id: string;
  conversation_id: string;
  turn_number: number;
  conversation_metadata: {
    client_persona: string;
    client_background: string;
    session_context: string;
    conversation_phase: string;
    expected_outcome: string;
    persona_archetype: string;
    emotional_arc: string;
    emotional_arc_key: string;
    training_topic: string;
    training_topic_key: string;
  };
  input: {
    role: "user";
    content: string;
    emotional_state?: {
      primary_emotion: string;
      intensity: number;
    };
  };
  target_output: {
    role: "assistant";
    content: string;
    emotional_strategy?: string;
  };
}
```

---

## 3. Target Data Format (Axolotl ShareGPT)

### 3.1 Axolotl Dataset Format

Axolotl supports the ShareGPT format for multi-turn conversations:

```typescript
interface AxolotlShareGPTDataset {
  // JSONL file - one JSON object per line
  conversations: AxolotlConversation[];
}

interface AxolotlConversation {
  // Each line in the JSONL file
  conversations: Message[];
}

interface Message {
  from: "system" | "human" | "gpt";
  value: string;
}
```

### 3.2 Example Transformed Record

**Input (BrightRun format):**
```json
{
  "conversation_metadata": {
    "conversation_id": "conv_001",
    "scaffolding": {
      "persona_name": "Jennifer Martinez",
      "emotional_arc": "Couple Conflict → Alignment"
    }
  },
  "training_pairs": [
    {
      "turn_number": 1,
      "input": {
        "content": "My husband and I can't agree on whether I should negotiate..."
      },
      "target_output": {
        "content": "Jennifer, I hear real tension in what you're describing..."
      }
    },
    {
      "turn_number": 2,
      "input": {
        "content": "Yes, exactly! He thinks I should just be grateful..."
      },
      "target_output": {
        "content": "It sounds like you're both trying to protect the family..."
      }
    }
  ]
}
```

**Output (Axolotl ShareGPT format):**
```json
{
  "conversations": [
    {
      "from": "system",
      "value": "You are Elena Morales, CFP of Pathways Financial Planning. You are a fee-only financial planner with 15 years of experience helping mid-career professionals. Your core principles: (1) Money is emotional - always acknowledge feelings before facts. (2) Create judgment-free space - normalize struggles explicitly. (3) Education-first - teach the why not just the what. (4) Progress over perfection - celebrate small wins. (5) Values-aligned decisions - personal context over generic rules."
    },
    {
      "from": "human",
      "value": "My husband and I can't agree on whether I should negotiate..."
    },
    {
      "from": "gpt",
      "value": "Jennifer, I hear real tension in what you're describing..."
    },
    {
      "from": "human",
      "value": "Yes, exactly! He thinks I should just be grateful..."
    },
    {
      "from": "gpt",
      "value": "It sounds like you're both trying to protect the family..."
    }
  ]
}
```

---

## 4. Data Transformation Implementation

### 4.1 Transformation Module Location

```
src/
├── lib/
│   └── training/
│       ├── data-transformer.ts       # Main transformation logic
│       ├── schemas/
│       │   ├── brightrun-v4.ts       # Source schema types
│       │   └── axolotl-sharegpt.ts   # Target schema types
│       └── utils/
│           ├── system-prompt-builder.ts  # Build system prompts
│           └── validation.ts         # Data validation
```

### 4.2 Transformation Logic

```typescript
// src/lib/training/data-transformer.ts

import { BrightRunTrainingFile, Conversation } from './schemas/brightrun-v4';
import { AxolotlConversation, Message } from './schemas/axolotl-sharegpt';

export class DataTransformer {
  private consultantProfile: ConsultantProfile;

  constructor(sourceData: BrightRunTrainingFile) {
    this.consultantProfile = sourceData.consultant_profile;
  }

  /**
   * Transform entire training file to Axolotl format
   */
  transformToAxolotl(sourceData: BrightRunTrainingFile): AxolotlConversation[] {
    const axolotlConversations: AxolotlConversation[] = [];

    for (const conversation of sourceData.conversations) {
      const axolotlConv = this.transformConversation(conversation);
      axolotlConversations.push(axolotlConv);
    }

    return axolotlConversations;
  }

  /**
   * Transform single conversation
   */
  private transformConversation(conversation: Conversation): AxolotlConversation {
    const messages: Message[] = [];

    // 1. Add system message with Elena's profile
    messages.push({
      from: "system",
      value: this.buildSystemPrompt()
    });

    // 2. Add each turn's user message and assistant response
    for (const pair of conversation.training_pairs) {
      // User message
      messages.push({
        from: "human",
        value: pair.input.content
      });

      // Assistant (Elena) response
      messages.push({
        from: "gpt",
        value: pair.target_output.content
      });
    }

    return { conversations: messages };
  }

  /**
   * Build Elena's system prompt from consultant profile
   */
  private buildSystemPrompt(): string {
    const profile = this.consultantProfile;

    const principles = Object.values(profile.core_philosophy)
      .map((p, i) => `(${i + 1}) ${p}`)
      .join('. ');

    return `You are ${profile.name} of ${profile.business}. You are a ${profile.expertise} with ${profile.years_experience} years of experience. Your core principles: ${principles}`;
  }

  /**
   * Write to JSONL file (one conversation per line)
   */
  writeToJsonl(conversations: AxolotlConversation[], outputPath: string): void {
    const lines = conversations.map(conv => JSON.stringify(conv));
    const content = lines.join('\n');
    // Write to file system
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /**
   * Split into train/validation sets
   */
  splitDataset(
    conversations: AxolotlConversation[],
    validationRatio: number = 0.1
  ): { train: AxolotlConversation[]; validation: AxolotlConversation[] } {
    const shuffled = [...conversations].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(shuffled.length * (1 - validationRatio));

    return {
      train: shuffled.slice(0, splitIndex),
      validation: shuffled.slice(splitIndex)
    };
  }
}
```

### 4.3 API Endpoint for Transformation

```typescript
// src/app/api/training/transform/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DataTransformer } from '@/lib/training/data-transformer';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { trainingFileId } = await request.json();

    // 1. Fetch training file from Supabase Storage
    const supabase = createClient();
    const { data: fileData, error: fetchError } = await supabase
      .storage
      .from('training-files')
      .download(`source/${trainingFileId}.json`);

    if (fetchError) throw fetchError;

    // 2. Parse source data
    const sourceData = JSON.parse(await fileData.text());

    // 3. Transform to Axolotl format
    const transformer = new DataTransformer(sourceData);
    const axolotlData = transformer.transformToAxolotl(sourceData);

    // 4. Split into train/validation
    const { train, validation } = transformer.splitDataset(axolotlData, 0.1);

    // 5. Convert to JSONL strings
    const trainJsonl = train.map(c => JSON.stringify(c)).join('\n');
    const valJsonl = validation.map(c => JSON.stringify(c)).join('\n');

    // 6. Upload to Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    await supabase.storage
      .from('training-files')
      .upload(`axolotl/${trainingFileId}/train_${timestamp}.jsonl`, trainJsonl);

    await supabase.storage
      .from('training-files')
      .upload(`axolotl/${trainingFileId}/validation_${timestamp}.jsonl`, valJsonl);

    // 7. Record transformation in database
    await supabase.from('training_transformations').insert({
      source_file_id: trainingFileId,
      train_file_path: `axolotl/${trainingFileId}/train_${timestamp}.jsonl`,
      validation_file_path: `axolotl/${trainingFileId}/validation_${timestamp}.jsonl`,
      train_count: train.length,
      validation_count: validation.length,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      trainCount: train.length,
      validationCount: validation.length,
      trainPath: `axolotl/${trainingFileId}/train_${timestamp}.jsonl`,
      validationPath: `axolotl/${trainingFileId}/validation_${timestamp}.jsonl`
    });

  } catch (error) {
    console.error('Transformation error:', error);
    return NextResponse.json({ error: 'Transformation failed' }, { status: 500 });
  }
}
```

---

## 5. Axolotl Integration

### 5.1 Axolotl Configuration Template

The engine will generate Axolotl configuration files dynamically:

```yaml
# axolotl-config-template.yaml
# This is a TEMPLATE - actual values are injected at runtime

base_model: meta-llama/Meta-Llama-3-70B-Instruct
model_type: LlamaForCausalLM

# Quantization for memory efficiency
load_in_4bit: true
adapter: qlora

# LoRA Configuration
lora_r: 16
lora_alpha: 32
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - v_proj
  - k_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

# Dataset Configuration
datasets:
  - path: ${TRAIN_DATA_PATH}
    type: sharegpt
    conversation: chatml

val_set_size: 0.0  # We use separate validation file
dataset_prepared_path: ./prepared_data

# Training Configuration
sequence_len: 4096
sample_packing: true
pad_to_sequence_len: true

# Hyperparameters
learning_rate: 0.0002
num_epochs: 3
micro_batch_size: 2
gradient_accumulation_steps: 8
warmup_ratio: 0.1

# Optimization
optimizer: paged_adamw_8bit
lr_scheduler: cosine
weight_decay: 0.01
max_grad_norm: 1.0

# Precision
bf16: true
tf32: true

# Logging & Checkpoints
logging_steps: 10
save_steps: 100
eval_steps: 100
save_total_limit: 3

# Output
output_dir: ${OUTPUT_DIR}

# Hardware
gradient_checkpointing: true
flash_attention: true

# Weights & Biases (optional)
wandb_project: ${WANDB_PROJECT}
wandb_run_id: ${WANDB_RUN_ID}
```

### 5.2 Configuration Generator

```typescript
// src/lib/training/axolotl-config-generator.ts

interface AxolotlConfigParams {
  trainDataPath: string;
  outputDir: string;
  baseModel: string;
  loraR: number;
  loraAlpha: number;
  learningRate: number;
  epochs: number;
  batchSize: number;
  gradientAccumulation: number;
  sequenceLength: number;
  wandbProject?: string;
  wandbRunId?: string;
}

export function generateAxolotlConfig(params: AxolotlConfigParams): string {
  const config = {
    base_model: params.baseModel,
    model_type: "LlamaForCausalLM",

    // Quantization
    load_in_4bit: true,
    adapter: "qlora",

    // LoRA
    lora_r: params.loraR,
    lora_alpha: params.loraAlpha,
    lora_dropout: 0.05,
    lora_target_modules: [
      "q_proj", "v_proj", "k_proj", "o_proj",
      "gate_proj", "up_proj", "down_proj"
    ],

    // Dataset
    datasets: [{
      path: params.trainDataPath,
      type: "sharegpt",
      conversation: "chatml"
    }],

    // Training
    sequence_len: params.sequenceLength,
    sample_packing: true,
    pad_to_sequence_len: true,
    learning_rate: params.learningRate,
    num_epochs: params.epochs,
    micro_batch_size: params.batchSize,
    gradient_accumulation_steps: params.gradientAccumulation,
    warmup_ratio: 0.1,

    // Optimization
    optimizer: "paged_adamw_8bit",
    lr_scheduler: "cosine",
    weight_decay: 0.01,
    max_grad_norm: 1.0,

    // Precision
    bf16: true,
    tf32: true,

    // Logging
    logging_steps: 10,
    save_steps: 100,
    save_total_limit: 3,

    // Output
    output_dir: params.outputDir,

    // Hardware
    gradient_checkpointing: true,
    flash_attention: true
  };

  // Add W&B if provided
  if (params.wandbProject) {
    config['wandb_project'] = params.wandbProject;
    config['wandb_run_id'] = params.wandbRunId || `run-${Date.now()}`;
  }

  // Convert to YAML
  return yaml.stringify(config);
}
```

---

## 6. RunPod Integration

### 6.1 RunPod Serverless Worker

The training runs on RunPod Serverless with a custom Docker image containing Axolotl:

```dockerfile
# Dockerfile for RunPod worker
FROM runpod/pytorch:2.1.0-py3.10-cuda12.1.0-devel-ubuntu22.04

# Install Axolotl
RUN pip install axolotl[flash-attn,deepspeed] --no-build-isolation

# Install additional dependencies
RUN pip install huggingface_hub wandb supabase

# Copy handler script
COPY handler.py /handler.py

# Set entrypoint
CMD ["python", "/handler.py"]
```

### 6.2 RunPod Handler

```python
# handler.py - RunPod serverless handler

import runpod
import subprocess
import os
import json
from supabase import create_client
from huggingface_hub import HfApi

def download_training_data(supabase_url, supabase_key, train_path, output_dir):
    """Download training data from Supabase Storage"""
    supabase = create_client(supabase_url, supabase_key)

    # Download training file
    response = supabase.storage.from_('training-files').download(train_path)

    local_path = f"{output_dir}/train.jsonl"
    with open(local_path, 'wb') as f:
        f.write(response)

    return local_path

def upload_adapter(output_dir, supabase_url, supabase_key, job_id):
    """Upload trained adapter to Supabase Storage"""
    supabase = create_client(supabase_url, supabase_key)

    # Find adapter files
    adapter_files = [
        'adapter_model.safetensors',
        'adapter_config.json',
        'README.md'
    ]

    for filename in adapter_files:
        filepath = f"{output_dir}/{filename}"
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                supabase.storage.from_('adapters').upload(
                    f"jobs/{job_id}/{filename}",
                    f.read()
                )

def handler(job):
    """Main handler for training job"""

    job_input = job['input']

    # Extract parameters
    config_yaml = job_input['config_yaml']
    train_path = job_input['train_path']
    job_id = job_input['job_id']
    supabase_url = job_input['supabase_url']
    supabase_key = job_input['supabase_key']

    # Setup directories
    work_dir = f"/tmp/training/{job_id}"
    os.makedirs(work_dir, exist_ok=True)

    try:
        # 1. Download training data
        local_train_path = download_training_data(
            supabase_url, supabase_key, train_path, work_dir
        )

        # 2. Write config file (update path)
        config_path = f"{work_dir}/config.yaml"
        config_yaml = config_yaml.replace('${TRAIN_DATA_PATH}', local_train_path)
        config_yaml = config_yaml.replace('${OUTPUT_DIR}', f"{work_dir}/output")
        with open(config_path, 'w') as f:
            f.write(config_yaml)

        # 3. Run Axolotl training
        result = subprocess.run(
            ['accelerate', 'launch', '-m', 'axolotl.cli.train', config_path],
            capture_output=True,
            text=True,
            cwd=work_dir
        )

        if result.returncode != 0:
            raise Exception(f"Training failed: {result.stderr}")

        # 4. Upload adapter to Supabase
        upload_adapter(f"{work_dir}/output", supabase_url, supabase_key, job_id)

        return {
            "status": "completed",
            "job_id": job_id,
            "adapter_path": f"jobs/{job_id}",
            "training_log": result.stdout[-5000:]  # Last 5000 chars
        }

    except Exception as e:
        return {
            "status": "failed",
            "job_id": job_id,
            "error": str(e)
        }

runpod.serverless.start({"handler": handler})
```

### 6.3 Training Job API

```typescript
// src/app/api/training/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAxolotlConfig } from '@/lib/training/axolotl-config-generator';

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID!;

export async function POST(request: NextRequest) {
  try {
    const {
      trainingFileId,
      trainPath,
      baseModel,
      hyperparameters
    } = await request.json();

    const supabase = createClient();

    // 1. Create job record
    const { data: job, error: jobError } = await supabase
      .from('training_jobs')
      .insert({
        training_file_id: trainingFileId,
        status: 'pending',
        base_model: baseModel,
        hyperparameters,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // 2. Generate Axolotl config
    const configYaml = generateAxolotlConfig({
      trainDataPath: '${TRAIN_DATA_PATH}',  // Placeholder, replaced in worker
      outputDir: '${OUTPUT_DIR}',
      baseModel: baseModel || 'meta-llama/Meta-Llama-3-70B-Instruct',
      loraR: hyperparameters?.lora_r || 16,
      loraAlpha: hyperparameters?.lora_alpha || 32,
      learningRate: hyperparameters?.learning_rate || 0.0002,
      epochs: hyperparameters?.epochs || 3,
      batchSize: hyperparameters?.batch_size || 2,
      gradientAccumulation: hyperparameters?.gradient_accumulation || 8,
      sequenceLength: hyperparameters?.sequence_length || 4096
    });

    // 3. Submit to RunPod
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: {
            config_yaml: configYaml,
            train_path: trainPath,
            job_id: job.id,
            supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY
          }
        })
      }
    );

    const runpodData = await runpodResponse.json();

    // 4. Update job with RunPod ID
    await supabase
      .from('training_jobs')
      .update({
        runpod_job_id: runpodData.id,
        status: 'running'
      })
      .eq('id', job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      runpodJobId: runpodData.id
    });

  } catch (error) {
    console.error('Training start error:', error);
    return NextResponse.json({ error: 'Failed to start training' }, { status: 500 });
  }
}
```

---

## 7. Database Schema

### 7.1 Training Jobs Table

```sql
-- Supabase SQL for training_jobs table

CREATE TABLE training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_file_id UUID NOT NULL REFERENCES training_files(id),

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'transforming', 'running', 'completed', 'failed')),

  -- Configuration
  base_model TEXT NOT NULL DEFAULT 'meta-llama/Meta-Llama-3-70B-Instruct',
  hyperparameters JSONB DEFAULT '{}',

  -- RunPod integration
  runpod_job_id TEXT,
  runpod_status TEXT,

  -- Results
  adapter_path TEXT,  -- Path in Supabase Storage
  training_metrics JSONB,  -- Loss curves, etc.
  final_loss FLOAT,

  -- Evaluation results (linked to Claude-as-Judge)
  baseline_evaluation_id UUID REFERENCES evaluations(id),
  trained_evaluation_id UUID REFERENCES evaluations(id),
  improvement_metrics JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- User tracking
  created_by UUID REFERENCES auth.users(id)
);

-- Index for status queries
CREATE INDEX idx_training_jobs_status ON training_jobs(status);
CREATE INDEX idx_training_jobs_created_by ON training_jobs(created_by);
```

### 7.2 Training Transformations Table

```sql
CREATE TABLE training_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file_id UUID NOT NULL REFERENCES training_files(id),

  -- Output files
  train_file_path TEXT NOT NULL,
  validation_file_path TEXT,

  -- Statistics
  train_count INTEGER NOT NULL,
  validation_count INTEGER DEFAULT 0,
  total_tokens INTEGER,

  -- Metadata
  format_version TEXT DEFAULT 'axolotl-sharegpt-v1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 Adapters Table

```sql
CREATE TABLE adapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_job_id UUID NOT NULL REFERENCES training_jobs(id),

  -- Storage
  storage_path TEXT NOT NULL,  -- Path in Supabase Storage
  size_bytes BIGINT,

  -- Model info
  base_model TEXT NOT NULL,
  lora_rank INTEGER,
  lora_alpha INTEGER,

  -- Performance metrics
  final_loss FLOAT,
  arc_completion_improvement FLOAT,
  empathy_score_improvement FLOAT,

  -- Deployment status
  is_deployed BOOLEAN DEFAULT FALSE,
  deployment_endpoint TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Storage Structure

### 8.1 Supabase Storage Buckets

```
training-files/
├── source/                    # Original BrightRun v4 JSON files
│   └── {file_id}.json
├── axolotl/                   # Transformed Axolotl format
│   └── {file_id}/
│       ├── train_{timestamp}.jsonl
│       └── validation_{timestamp}.jsonl

adapters/
├── jobs/
│   └── {job_id}/
│       ├── adapter_model.safetensors
│       ├── adapter_config.json
│       └── README.md
├── deployed/                  # Production adapters
│   └── {adapter_id}/
│       └── ...
```

---

## 9. API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/training/transform` | POST | Transform BrightRun → Axolotl format |
| `/api/training/start` | POST | Start training job on RunPod |
| `/api/training/status/{jobId}` | GET | Get training job status |
| `/api/training/jobs` | GET | List all training jobs |
| `/api/training/cancel/{jobId}` | POST | Cancel running job |
| `/api/adapters` | GET | List trained adapters |
| `/api/adapters/{adapterId}` | GET | Get adapter details |
| `/api/adapters/{adapterId}/deploy` | POST | Deploy adapter to inference |

---

## 10. Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# RunPod
RUNPOD_API_KEY=your_runpod_api_key
RUNPOD_ENDPOINT_ID=your_endpoint_id

# Hugging Face (for model downloads)
HF_TOKEN=your_huggingface_token

# Weights & Biases (optional)
WANDB_API_KEY=your_wandb_key
WANDB_PROJECT=brightrun-lora-training
```

---

## 11. Implementation Checklist

### Phase 1: Data Transformation (Days 1-2)
- [ ] Create `src/lib/training/schemas/brightrun-v4.ts`
- [ ] Create `src/lib/training/schemas/axolotl-sharegpt.ts`
- [ ] Implement `DataTransformer` class
- [ ] Create `/api/training/transform` endpoint
- [ ] Test transformation with sample data
- [ ] Create Supabase Storage buckets

### Phase 2: Axolotl Configuration (Days 2-3)
- [ ] Create config template YAML
- [ ] Implement `generateAxolotlConfig()` function
- [ ] Add hyperparameter validation
- [ ] Test config generation

### Phase 3: RunPod Integration (Days 3-4)
- [ ] Build Docker image with Axolotl
- [ ] Deploy to RunPod as serverless endpoint
- [ ] Implement `handler.py` worker
- [ ] Test end-to-end training flow

### Phase 4: Database & API (Days 4-5)
- [ ] Create database tables in Supabase
- [ ] Implement all API endpoints
- [ ] Add job status polling
- [ ] Implement adapter storage

### Phase 5: UI Integration (Days 5-6)
- [ ] Connect training UI to APIs
- [ ] Display job progress
- [ ] Show training metrics
- [ ] Enable adapter management

---

## 12. Success Criteria

| Metric | Target |
|--------|--------|
| Data transformation accuracy | 100% (no data loss) |
| Training job success rate | > 90% |
| Training time (242 conversations) | < 12 hours |
| Training cost per run | < $100 |
| Adapter size | < 500MB |
| End-to-end latency (submit to complete) | < 15 hours |

---

**Document Status:** Complete Pre-Build Specification
**Version:** 1.0
**Next Step:** Implement according to checklist, then run Claude-as-Judge evaluation per companion spec
