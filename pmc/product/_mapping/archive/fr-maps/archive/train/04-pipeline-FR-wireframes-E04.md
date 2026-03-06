# LoRA Pipeline - Functional Requirements
**Version:** 2.0.0  
**Date:** 12/16/2025  
**Category:** Design System Platform
**Product Abbreviation:** pipeline

**Source References:**
- Seed Story: `pmc\product\00-pipeline-seed-story.md`
- Overview Document: `pmc\product\01-pipeline-overview.md`
- User Stories: `pmc\product\02-pipeline-user-stories.md`


## 4. Model Artifacts & Downloads

- **FR4.1.1:** Download Trained LoRA Adapters
  * Description: [To be filled]
  * Impact Weighting: Productivity / Time-to-Value / Ease of Use
  * Priority: High
  * User Stories: US4.1.1
  * Tasks: [T-4.1.1]
  * User Story Acceptance Criteria:
    - Completed jobs show "Download Adapters" button (prominent, green)
    - Click initiates ZIP file download: `{job_name}-adapters-{job_id}.zip`
    - ZIP contains:
    - `adapter_model.bin` (200-500MB): Trained LoRA weight matrices
    - `adapter_config.json`: Configuration file (rank, alpha, target_modules, etc.)
    - `README.txt`: Quick integration instructions
    - `training_summary.json`: Final metrics (loss, perplexity, duration, cost)
    - Download progress indicator for large files
    - Generate signed URL valid for 24 hours (security)
    - After 24 hours: Regenerate download link
    - Track download count and timestamp for audit trail
    - Notification after download: "Adapters downloaded. See README.txt for integration instructions."
    - Example README content:
      ```
      Bright Run LoRA Adapters - Training Job: {job_name}
      
      Files:
      - adapter_model.bin: Trained weight matrices
      - adapter_config.json: LoRA configuration
      
      Integration:
      1. Install dependencies: pip install transformers peft torch
      2. Load base model: Llama 3 70B
      3. Load adapters: model = PeftModel.from_pretrained(base_model, adapter_path)
      4. Run inference: See example_inference.py
      
      Support: docs.brightrun.ai/lora-adapters
      ```
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.1.2:** Adapter Storage and Versioning
  * Description: [To be filled]
  * Impact Weighting: Data Management / Version Control / Recovery
  * Priority: Medium
  * User Stories: US4.1.2
  * Tasks: [T-4.1.2]
  * User Story Acceptance Criteria:
    - All adapter files stored in Supabase Storage bucket: `model-artifacts`
    - Folder structure: `{job_id}/adapters/`
    - Files: `adapter_model.bin`, `adapter_config.json`, `training_summary.json`
    - Storage retention: Permanent by default (configurable)
    - Versioning: Each training job creates unique version
    - Job details page shows:
    - Storage path
    - File sizes
    - Upload timestamp
    - Download count
    - Option to delete adapters (free up storage): Requires confirmation, creates audit log entry
    - Storage usage dashboard:
    - Total storage used: 15.3 GB
    - Number of stored models: 23
    - Average model size: 665 MB
    - Storage cost estimate (if applicable)
    - Bulk operations: Delete multiple old adapters to free storage
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.2.1:** Export Training Metrics as CSV/JSON
  * Description: [To be filled]
  * Impact Weighting: Reporting / Analysis / Quality Assurance
  * Priority: Medium
  * User Stories: US4.2.1
  * Tasks: [T-4.2.1]
  * User Story Acceptance Criteria:
    - "Export Metrics" button on job details page
    - Format options: CSV (spreadsheet analysis) / JSON (programmatic access)
    - **CSV Export** includes columns:
    - step_number, epoch, training_loss, validation_loss, learning_rate, perplexity, gpu_utilization, timestamp, elapsed_time_seconds
    - **JSON Export** includes nested structure:
      ```json
      {
        "job_metadata": { "job_id": "...", "name": "...", "configuration": {...} },
        "training_metrics": [
          { "step": 100, "epoch": 1, "training_loss": 0.521, "validation_loss": 0.538, ... },
          { "step": 200, "epoch": 1, "training_loss": 0.489, "validation_loss": 0.502, ... }
        ],
        "final_metrics": { "final_training_loss": 0.287, "final_validation_loss": 0.312, "perplexity_improvement": "31%" }
      }
      ```
    - Export includes all historical data from training start to completion
    - File naming: `{job_name}-metrics-{timestamp}.{csv|json}`
    - One-click download, no generation delay
    - Option to include charts (loss curves) as embedded PNG in export package
    - Track export count for audit trail
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.2.2:** Generate Training Report PDF
  * Description: [To be filled]
  * Impact Weighting: Client Communication / Professionalism / Sales Enablement
  * Priority: Low
  * User Stories: US4.2.2
  * Tasks: [T-4.2.2]
  * User Story Acceptance Criteria:
    - "Generate Report" button on completed job details page
    - PDF report includes:
    - **Cover Page**: Job name, training date, Bright Run branding
    - **Executive Summary** (1 page):
    - Training file: 242 conversations, quality scores
    - Configuration: Balanced preset, H100 spot instance
    - Duration: 13.2 hours
    - Final training loss: 0.287 (baseline: 1.423) - **80% improvement**
    - Cost: $48.32
    - Status: Completed successfully
    - **Training Metrics** (2 pages):
    - Loss curves graph (training + validation)
    - Learning rate schedule graph
    - Metrics table: Final loss, perplexity, GPU utilization
    - Convergence analysis: "Loss plateaued at epoch 2.5, indicating optimal training completion"
    - **Cost Breakdown** (1 page):
    - GPU cost: $33.12 (spot H100, 13.2 hours @ $2.49/hr)
    - Spot interruptions: 2 (recovery overhead: $1.20)
    - Storage costs: $0.15
    - Total cost: $48.32
    - Cost efficiency: "68% cheaper than on-demand ($146 estimate)"
    - **Appendix**:
    - Full configuration details
    - Checkpoint history
    - Event log summary
    - Report generation takes 5-10 seconds
    - Preview report before download
    - File naming: `{job_name}-training-report-{timestamp}.pdf`
    - Shareable via secure link (30-day expiration)
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.3.1:** Create Complete Deployment Package
  * Description: [To be filled]
  * Impact Weighting: Client Success / Integration Speed / Support Reduction
  * Priority: Medium
  * User Stories: US4.3.1
  * Tasks: [T-4.3.1]
  * User Story Acceptance Criteria:
    - "Download Deployment Package" button on completed jobs
    - ZIP file: `{job_name}-deployment-package-{job_id}.zip`
    - **Package contents**:
      1. `adapters/` folder:
         - adapter_model.bin
         - adapter_config.json
      2. `inference.py`:
         - Runnable Python script loading base model + adapters
         - Accepts prompt as CLI argument
         - Outputs model response
         - Configurable temperature, max_tokens
      3. `requirements.txt`:
         - Exact Python dependencies with versions
         - transformers==4.36.0, peft==0.7.1, torch==2.1.2, accelerate==0.25.0
      4. `README.md`:
         - Setup instructions (create venv, install deps)
         - Usage examples (run inference.py)
         - Deployment options (local, cloud, API endpoint)
         - Troubleshooting common issues
         - Support contact info
      5. `example_prompts.json`:
         - 10 sample prompts matching training domain (financial advisory)
         - Expected response quality examples
      6. `training_summary.json`:
         - Job metadata, configuration, final metrics
    - Inference script works with: `pip install -r requirements.txt && python inference.py "What are the benefits of a Roth IRA?"`
    - README includes GPU requirements, VRAM usage, inference speed estimates
    - Package size: ~500-700MB
    - Generate signed URL, valid 48 hours
  * Functional Requirements Acceptance Criteria:
    - [To be filled]

- **FR4.3.2:** API Inference Endpoint Template
  * Description: [To be filled]
  * Impact Weighting: Client Success / Integration Speed / Developer Experience
  * Priority: Low (Future Enhancement)
  * User Stories: US4.3.2
  * Tasks: [T-4.3.2]
  * User Story Acceptance Criteria:
    - Deployment package includes `api_server/` folder:
    - `app.py`: FastAPI application serving inference endpoint
    - `Dockerfile`: Container image for deployment
    - `docker-compose.yml`: Local testing setup
    - `deploy_guide.md`: Deployment instructions (Docker, Kubernetes, cloud platforms)
    - API endpoints:
    - `POST /api/v1/chat`: Send prompt, receive model response
    - `GET /api/v1/health`: Health check endpoint
    - `GET /api/v1/model-info`: Model metadata (training job, version, metrics)
    - API features:
    - Request validation (max prompt length, rate limiting)
    - Response streaming (SSE)
    - Authentication (API key)
    - Logging (request/response tracking)
    - Docker image size: <5GB
    - Startup time: <60 seconds (model loading)
    - Inference latency: <2 seconds per response
    - Deployment guide covers:
    - Local testing: `docker-compose up`
    - Cloud deployment: AWS ECS, GCP Cloud Run, Azure Container Instances
    - GPU support: Specify GPU requirements, optimize for A10G/A100/H100
    - Example API request:
      ```bash
      curl -X POST http://localhost:8000/api/v1/chat \
        -H "Authorization: Bearer <api_key>" \
        -H "Content-Type: application/json" \
        -d '{"prompt": "Explain asset allocation", "max_tokens": 500}'
      ```
  * Functional Requirements Acceptance Criteria:
    - [To be filled]
