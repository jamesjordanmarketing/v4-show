# Spec 26: LoRA Adapter Management — User Testing Tutorial

**Version:** 2.0
**Date:** 2026-03-03
**Coverage:** All features built in E01–E05
**Audience:** QA and product team — manual verification of the complete Adapter Detail Page feature set
**Platform:** https://v4-show.vercel.app

---

## Overview

Spec 26 introduced a complete adapter management and reporting layer on top of the existing LoRA training pipeline. This tutorial walks through every testable feature in order, from the first entry point (the Adapter History list) through to the Lifecycle Actions that permanently remove an adapter from RunPod.

All testing in this document takes place on the live Vercel deployment at **https://v4-show.vercel.app**. No local dev server is required.

**What was built:**
- A new **Adapter Detail Page** at `https://v4-show.vercel.app/workbase/{id}/fine-tuning/launch/adapter/{jobId}`
- Clickable entries in the **Adapter History** list on the Launch Tuning page
- A **Deployment Report** showing the 4-step deployment pipeline
- An **Adapter Status Ping** widget for live GPU health checks
- An **Endpoint Restart Tool** for manual worker cycling with real-time progress
- A **Lifecycle Actions** card for removing an adapter from RunPod
- A **Training Configuration** summary card

---

## Prerequisites

Before running these tests, the following must be in place:

1. **Access to the Vercel deployment** — Open a browser and confirm you can reach:
   ```
   https://v4-show.vercel.app
   ```
   Sign in with your account credentials if prompted.

2. **A Work Base with at least one completed training job** — You need a job in the `completed` status to access the Adapter Detail Page. If no completed job exists, run a training job first via the Launch Tuning page.

3. **E01–E05 database migrations applied** — The `deployment_log` and `adapter_status` columns must exist on `pipeline_training_jobs`, and the `endpoint_restart_log` table must exist. These are applied to the shared Supabase database used by the Vercel deployment.

4. **Your Work Base ID** — Find it in the URL when you navigate to any page in that Work Base:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/...
   ```
   Copy the UUID segment after `/workbase/` — you will use it throughout this tutorial.

---

## Section 1: Adapter History — Click-Through Navigation

### What was changed
The Adapter History list on the Launch Tuning page now makes **Completed** entries clickable. They show a "· View details →" label and navigate to the Adapter Detail Page on click.

### Path to feature
```
https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch
```

### Test 1.1 — Completed entry is clickable

1. Navigate to:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch
   ```
2. Scroll to the **Adapter History** section (bottom of the main content column, left panel).
3. Locate a row with a **Completed** badge (green).

**Expected:**
- The row shows `cursor-pointer` on hover (the cursor changes to a hand icon).
- A `· View details →` text in blue appears in the subtitle line beneath the job name.
- The row has a subtle hover background change (`hover:bg-muted/80`).

### Test 1.2 — Click navigates to detail page

1. Click on a Completed adapter row.

**Expected:**
- Browser navigates to:
  ```
  https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
  ```
- The Adapter Detail Page loads with the job name in the heading.

### Test 1.3 — Non-completed entries are NOT clickable

1. In the Adapter History list, find a row with any other status (Pending, Training, Failed, Cancelled).

**Expected:**
- No `cursor-pointer` on hover.
- No `· View details →` text.
- Clicking does nothing — the page does not navigate.

---

## Section 2: Adapter Detail Page — Header and Breadcrumb

### Path to feature
```
https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
```

Navigate here by clicking a Completed row in Adapter History (Test 1.2), or navigate directly by substituting your own Work Base ID and Job ID into the URL above.

### Test 2.1 — Breadcrumb navigates back

1. On the Adapter Detail Page, click **← Launch Tuning** at the top.

**Expected:**
- Navigates back to:
  ```
  https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch
  ```

### Test 2.2 — Header shows correct adapter identity

1. Observe the page header area below the breadcrumb.

**Expected:**
- **Job name** (e.g., "Emotional Intelligence v1.0") displayed as the `<h1>`.
- A **status badge** next to the name:
  - "Active" (default/filled badge) — adapter is live on RunPod
  - "Superseded" (secondary/outline badge) — replaced by a newer deploy
  - "Deleted" (secondary/outline badge) — HuggingFace repo removed
- Below the name: the adapter ID in monospace font (e.g., `adapter-e8fa481f`)
- If the adapter has a deployment log with an `hf_path`: a **"View on HuggingFace →"** link appears next to the adapter ID. Clicking it opens `https://huggingface.co/{hf_path}` in a new tab.
- If there is no deployment log (historical adapter deployed before E01): the HuggingFace link is absent, and the adapter ID is derived as `adapter-{first 8 chars of jobId}`.

### Test 2.3 — Page loads correctly for historical adapters (no deployment log)

1. Find a job that was completed before the Spec 26 migrations were applied (i.e., it has no `deployment_log` data in the database).
2. Navigate to:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```

**Expected:**
- Page loads without errors.
- Deployment Report card shows the graceful empty state:
  > "No deployment data available. This adapter may have been deployed before deployment logging was added."
- All other cards (Status Ping, Restart Tool, Training Config, Lifecycle Actions) still render correctly.

---

## Section 3: Deployment Report (DeploymentTimeline)

The Deployment Report card is on the **left column** of the main grid on the Adapter Detail Page. It shows the 4-step pipeline that ran when the adapter was originally deployed.

### What it shows (for adapters deployed after E01)

The card has four timeline steps:

| Step | What it means |
|------|---------------|
| ✓ HuggingFace Upload | Files were committed to HuggingFace; shows file count, repo path, and first 8 chars of commit OID |
| ✓ RunPod LORA_MODULES Updated | The endpoint's `LORA_MODULES` env var was updated; shows endpoint ID and total adapter count |
| ✓ Workers Cycled | Workers were scaled down to 0 and back up after deployment |
| ✓ Inference Verified | A test inference call confirmed the adapter responds correctly |

### Test 3.1 — All steps show success (happy path, new adapter)

1. Navigate to the Adapter Detail Page for an adapter deployed **after** the E01 migrations:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```
2. Observe the Deployment Report card.

**Expected:**
- All four steps show a green ✓ `CheckCircle2` icon.
- HuggingFace Upload detail: `3 files · BrightHub2/lora-... · commit a1b2c3d4`
- RunPod LORA_MODULES detail: `Endpoint: 780tauhj7c126b · N total adapter(s) after update`
- Workers Cycled detail: `Scale: 0 → ready`
- Inference Verified detail: `Adapter responded successfully to test inference`

### Test 3.2 — Workers Cycled shows "Pending" if `worker_refresh` is null

This can occur if the `refreshInferenceWorkers` Inngest function has not yet completed (the deployment is very recent and workers are still cycling).

**Expected:**
- Workers Cycled shows a grey `Clock` icon.
- Detail text: `Pending worker refresh...`

### Test 3.3 — Inference Verified shows failure state

This can occur if inference verification failed during deployment (e.g., workers came up but the adapter was slow to load).

**Expected:**
- Inference Verified shows a red `XCircle` icon.
- Detail shows the error message from `verification_error`, or: `Inference verification failed`

### Test 3.4 — HuggingFace link opens correct repo

1. Click the **"View on HuggingFace"** link at the bottom of the Deployment Report card.

**Expected:**
- Opens `https://huggingface.co/{hf_path}` in a new tab.
- The repo page on HuggingFace is visible and contains the adapter files.

### Test 3.5 — LORA_MODULES snapshot is expandable

1. Click the **"LORA_MODULES snapshot (N)"** button at the bottom of the Deployment Report card (only visible if there are adapters in the snapshot).

**Expected:**
- Expands to show a JSON block with the array of `{ name, path }` objects that were in `LORA_MODULES` at deploy time.
- Clicking again collapses it.

---

## Section 4: Adapter Status Ping

The Adapter Status Ping card is on the **right column**, top position. It performs a live check against RunPod — it is **never automatic**; it only runs when you click the button.

> **Important:** Each ping runs a live GPU inference request and costs approximately $0.01–$0.02. Do not click repeatedly in quick succession.

### Test 4.1 — Initial state (before first ping)

1. Navigate to the Adapter Detail Page:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```
2. Observe the **Adapter Status** card before clicking anything.

**Expected:**
- The adapter ID is shown in a monospace code block.
- A **Copy** button is visible next to the adapter ID.
- The message area shows:
  > "Click Refresh Status to check adapter health."
  > "Note: Each ping runs a live inference request (~$0.01–$0.02)."
- A **"Refresh Status"** button is at the bottom.

### Test 4.2 — Copy adapter ID

1. Click the **Copy** button next to the adapter ID.

**Expected:**
- A toast notification appears: "Adapter ID copied"
- The adapter ID string (e.g., `adapter-e8fa481f`) is now in the clipboard. Paste it (Ctrl+V / Cmd+V) to verify.

### Test 4.3 — Trigger a ping

1. Click the **"Refresh Status"** button.

**Expected during ping:**
- Button changes to a spinning icon with text "Checking..." and becomes disabled.

**Expected after ping (success):**
Three status rows appear:

| Row | What it shows |
|-----|---------------|
| Registered in LORA_MODULES | Green ✓ if adapter name is found in `LORA_MODULES`; Red ✗ if absent |
| Workers online | Green ✓ with ready + idle counts; Red ✗ if all workers are 0 |
| Inference verified | Green ✓ with latency in ms; Red ✗ with error message if failed |

- A "Last checked: {datetime}" timestamp appears below the rows.

**Expected after ping (adapter not found):**
- LORA_MODULES row: red ✗ with "Adapter not found in endpoint configuration"
- Workers row may still show green if other adapters are active.
- Inference row: red ✗ with an error message.

### Test 4.4 — 10-second cooldown enforcement

1. After clicking "Refresh Status" and seeing results, click **"Refresh Status"** again within 10 seconds.

**Expected:**
- A toast error appears: "Please wait 10 seconds between pings."
- No network request is made. The existing ping results remain visible.

### Test 4.5 — Wait and re-ping

1. After waiting at least 10 seconds from the previous ping, click **"Refresh Status"** again.

**Expected:**
- The ping runs normally.
- The "Last checked" timestamp updates to the new time.

---

## Section 5: Endpoint Restart Tool

The Endpoint Restart Tool card is on the **right column**, below the Adapter Status card. It allows manual cycling of RunPod inference workers.

> **Warning:** Restarting workers causes **all** adapter inference across **all Work Bases** to be unavailable for approximately 45–270 seconds. Each restart costs approximately $0.50–$2.00.

### Test 5.1 — Initial state (no restart history)

1. Navigate to the Adapter Detail Page for an adapter that has never been manually restarted:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```
2. Observe the **Endpoint Restart** card.

**Expected:**
- Message: "No restart history for this adapter. If the adapter was deployed but workers haven't picked it up, use the button below to cycle inference workers."
- A **"Restart Endpoint Workers"** button is visible and enabled.

### Test 5.2 — Confirmation dialog appears on click

1. Click **"Restart Endpoint Workers"**.

**Expected:**
- A modal `AlertDialog` appears (not a native browser `window.confirm`).
- Dialog title: "Restart Inference Workers?"
- Dialog body contains three key pieces of information:
  1. All adapter inference across all Work Bases will be interrupted (45–270 seconds).
  2. Worker restart costs approximately $0.50–$2.00 per cycle.
  3. Use this if the adapter was deployed but workers haven't picked it up yet.
- Two buttons: **Cancel** and **Restart Workers**.

### Test 5.3 — Cancel dialog

1. Click the **Cancel** button in the confirmation dialog.

**Expected:**
- Dialog closes.
- No restart is triggered.
- The Endpoint Restart card remains unchanged.

### Test 5.4 — Trigger a restart (full happy path)

1. Click **"Restart Endpoint Workers"**, then click **"Restart Workers"** in the dialog.

**Expected immediately:**
- Dialog closes.
- Toast appears: "Restart initiated. This will take 1–4 minutes."
- The Endpoint Restart card switches to "in progress" view:
  - Blue text: "Restart in progress..." with a spinning loader.
  - Five step rows appear:
    - Scale workers down
    - Workers terminated
    - Scale workers up
    - Workers ready
    - Verify adapter
  - The **"Restart Endpoint Workers"** button is disabled and shows "Restart in Progress..."

**Expected during restart (auto-polling every 5 seconds):**
- Steps complete sequentially. The page polls automatically — no refresh required.
- Each completed step shows a green ✓ icon and a timestamp (e.g., `3:42:07 PM`).
- The current active step shows a blue spinning icon.
- Pending steps show a grey `Clock` icon.

**Expected after restart completes (approximately 1–4 minutes):**
- The in-progress view is replaced by the completed view.
- A **verdict card** appears:

| Scenario | Verdict card |
|----------|-------------|
| Adapter verified ✓ | Green card: "Adapter is active and verified on inference endpoint" |
| Workers up but inference unverified | Yellow card: "Restart completed but adapter inference verification failed" + action text |
| Adapter was not in LORA_MODULES | Yellow card: "Adapter was not in LORA_MODULES when restart began" + action text |
| Restart process failed | Red card: "Restart failed at step: {step name}" |

- Step summary rows show final outcomes (scale down success, workers ready, adapter verified, LORA_MODULES confirmation).
- "Last Restart" shows the datetime and a trigger source badge (either `manual` or `auto`).
- The **"Restart Endpoint Workers"** button is re-enabled.

### Test 5.5 — Concurrent restart is blocked

1. While a restart is in progress (or immediately after triggering one), open a second browser tab and navigate to the Adapter Detail Page for a **different** adapter in the same Work Base:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{otherJobId}
   ```
2. Attempt to trigger another restart from the second tab.

**Expected:**
- An error toast appears: "A restart is already in progress. Wait for it to complete before triggering another."
- No second restart is initiated.

### Test 5.6 — Adapter not deployed blocks restart

1. Find a training job that has `status = 'completed'` but no HuggingFace path (deployment failed before the HuggingFace upload step).
2. Navigate to its Adapter Detail Page:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```
3. Click **"Restart Endpoint Workers"** and confirm in the dialog.

**Expected:**
- Error toast: "Adapter has not been deployed yet. Wait for deployment to complete before restarting."
- No restart log is created.

### Test 5.7 — Restart history is shown for auto restarts

1. Navigate to the Adapter Detail Page for an adapter that was freshly deployed after E02 (its automatic worker-refresh has completed).

**Expected:**
- The Endpoint Restart card shows the history from the automatic restart that ran during deployment:
  - Trigger badge shows `auto`.
  - Steps and timestamps reflect the auto-restart.
  - The verdict card reflects whether the auto-restart verified the adapter.

---

## Section 6: Training Configuration Card

The Training Configuration card is below the main two-column grid, spanning the full width.

### Test 6.1 — Card shows correct training parameters

1. Navigate to the Adapter Detail Page for any completed job:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```
2. Observe the **Training Configuration** card.

**Expected:**
Four fields in a responsive grid:

| Field | Source | Example |
|-------|--------|---------|
| Sensitivity | `job.trainingSensitivity` | "medium" (capitalized) |
| Progression | `job.trainingProgression` | "high" (capitalized) |
| Repetition | `job.trainingRepetition` | "3 epochs" |
| Cost | `job.estimatedCost` | "$4.20" |

- If `trainingTimeSeconds` is available: a line below the grid reads "Training duration: Xm Ys".
- All null/undefined fields gracefully show `—` instead of crashing.

### Test 6.2 — Null fields show graceful dash

1. If you have a job with some null fields (e.g., `estimatedCost` is null), navigate to its detail page.

**Expected:**
- The null field shows `—` rather than blank space or an error.

---

## Section 7: Lifecycle Actions — Remove from RunPod

The Lifecycle Actions card is at the bottom of the page.

### Test 7.1 — Initial state for an active adapter

1. Navigate to the Adapter Detail Page for an **active** adapter:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```
2. Observe the **Lifecycle Actions** card.

**Expected:**
- Status text: "This adapter is **active** for this Work Base."
- A **"Remove from RunPod"** button is enabled.
- Explanatory text: "Removing an adapter from RunPod does not delete it from HuggingFace. Workers will need to restart before the adapter is fully unloaded from GPU memory."

### Test 7.2 — Confirmation dialog appears on click

1. Click **"Remove from RunPod"**.

**Expected:**
- A modal `AlertDialog` appears (not `window.confirm`).
- Dialog title: "Remove Adapter from RunPod?"
- Dialog body mentions:
  - The specific adapter ID in a monospace code element.
  - That it will be removed from RunPod LORA_MODULES.
  - That it will no longer be available for inference after the next worker restart.
  - That the adapter remains on HuggingFace and can be re-deployed.
- Two buttons: **Cancel** and **Remove from RunPod**.

### Test 7.3 — Cancel remove dialog

1. Click the **Cancel** button.

**Expected:**
- Dialog closes.
- No API call is made.
- The button is still enabled.

### Test 7.4 — Confirm removal

1. Click **"Remove from RunPod"**, then click **"Remove from RunPod"** in the dialog.

**Expected immediately:**
- The button switches to a loading state ("Removing..." with a spinner).
- The API call is made to `POST https://v4-show.vercel.app/api/pipeline/adapters/{jobId}/remove`.

**Expected on success:**
- A success toast appears containing the API message, e.g.:
  > "adapter-e8fa481f removed from RunPod LORA_MODULES. Workers will need to restart to unload it from GPU memory."
- The page refreshes.
- After refresh: the status badge in the header now shows **"Superseded"**.
- The **"Remove from RunPod"** button is now disabled (adapter is no longer active).
- Status text in the card reads: "This adapter is **superseded** for this Work Base."

### Test 7.5 — Button is disabled for superseded adapters

1. Navigate to the Adapter Detail Page for an adapter with `adapterStatus = 'superseded'` or `'deleted'`.

**Expected:**
- The **"Remove from RunPod"** button is disabled and cannot be clicked.
- The status text reflects the current status ("superseded" or "deleted").

### Test 7.6 — Remove an adapter that is not in LORA_MODULES

1. If an adapter has already been removed from LORA_MODULES externally (e.g., superseded by a newer deploy) but the DB still shows it as active, attempt removal.

**Expected:**
- An error toast appears: "Adapter is not in LORA_MODULES — may have already been removed."
- The page state does not change.

---

## Section 8: End-to-End Flow Test

This test verifies the full round trip from training job completion through the adapter lifecycle. Perform this entirely on the Vercel platform — no local tooling required.

### Setup

You need a Work Base where you can trigger a new training job. If you cannot train a new job in this session, use an existing completed job starting from Step 3.

### Flow

**Step 1 — Launch Training**
1. Navigate to:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch
   ```
2. Select a training set, enter a job name, configure parameters, click **Train & Publish**.
3. Watch the inline Training Progress card as the job runs.

**Step 2 — Wait for Deployment**
After the job reaches "Completed" status, the `autoDeployAdapter` → `refreshInferenceWorkers` pipeline runs automatically in the background via Inngest. This typically takes 3–10 minutes total. The page does not need to remain open — you can refresh and return.

**Step 3 — Verify Adapter History entry**
1. Navigate back to:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch
   ```
2. In the Adapter History section, confirm the entry shows a green **Completed** badge, the `· View details →` label, and is clickable.

**Step 4 — Click through to Detail Page**
1. Click the completed entry.
2. Confirm the browser navigates to:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/{jobId}
   ```
3. Confirm the job name appears in the `<h1>` heading.

**Step 5 — Review Deployment Report**
1. Verify all four deployment steps show green ✓ icons.
2. Click the LORA_MODULES snapshot to confirm your adapter is listed.
3. Click **"View on HuggingFace"** and confirm the repo exists with the adapter files.

**Step 6 — Run Adapter Status Ping**
1. Click **Refresh Status**.
2. Verify all three rows are green:
   - Registered in LORA_MODULES ✓
   - Workers online ✓
   - Inference verified ✓

**Step 7 — Trigger a Manual Restart**
1. Click **Restart Endpoint Workers**, read the warning carefully, confirm.
2. Watch the step-by-step progress auto-update on the page (takes 1–4 minutes). Do not navigate away.
3. Confirm the verdict card shows a green **SUCCESS** after completion.
4. Re-run the Adapter Status Ping to confirm the adapter is still available post-restart.

**Step 8 — Remove the Adapter**
1. Click **Remove from RunPod** and confirm.
2. Verify the success toast and that the status badge in the header changes to "Superseded".
3. Click **Refresh Status** — the LORA_MODULES row should now show red ✗.
4. Navigate back to:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch
   ```
   Confirm the removed adapter's row in Adapter History reflects the Superseded state where applicable.

---

## Section 9: Error State Coverage

These tests verify graceful handling of known error paths.

### Test 9.1 — Navigate to a non-existent job ID

1. Manually enter a fake UUID into the URL:
   ```
   https://v4-show.vercel.app/workbase/{YOUR_WORKBASE_ID}/fine-tuning/launch/adapter/00000000-0000-0000-0000-000000000000
   ```

**Expected:**
- Page shows a red destructive alert: "Adapter not found."
- No crash or unhandled error.

### Test 9.2 — Ping when workers are offline

1. If the RunPod endpoint is currently at 0 workers (e.g., during off-hours auto-scaling), navigate to any Adapter Detail Page and run the Adapter Status Ping.

**Expected:**
- Workers online row shows red ✗: "Workers offline — endpoint is scaled to 0"
- Inference row shows red ✗ with an error message.
- No crash or broken UI.

### Test 9.3 — Restart status shows failed state correctly

Navigate to an adapter whose most recent restart log has `status = 'failed'` (e.g., workers failed to terminate within the timeout).

**Expected:**
- Verdict card is red: "Restart failed at step: {step name}"
- Steps up to the failure point show green ✓.
- The failed step shows red ✗.
- Steps after the failure show grey `Clock` (pending/never reached).
- The error message (if any) is shown in a red box below the step summary.
- The **"Restart Endpoint Workers"** button is re-enabled (failure is a terminal state).

---

## Appendix A: Feature → Full URL Quick Reference

All URLs are based on **https://v4-show.vercel.app**. Replace `{id}` with your Work Base UUID and `{jobId}` with the training job UUID.

| Feature | Full URL |
|---------|---------|
| Launch Tuning page (Adapter History list) | `https://v4-show.vercel.app/workbase/{id}/fine-tuning/launch` |
| Adapter Detail Page | `https://v4-show.vercel.app/workbase/{id}/fine-tuning/launch/adapter/{jobId}` |
| API: Deployment Log | `GET https://v4-show.vercel.app/api/pipeline/jobs/{jobId}/deployment-log` |
| API: Live Status Ping | `GET https://v4-show.vercel.app/api/pipeline/adapters/{jobId}/ping` |
| API: Trigger Restart | `POST https://v4-show.vercel.app/api/pipeline/adapters/{jobId}/restart` |
| API: Poll Restart Progress | `GET https://v4-show.vercel.app/api/pipeline/adapters/{jobId}/restart-status` |
| API: Remove Adapter | `POST https://v4-show.vercel.app/api/pipeline/adapters/{jobId}/remove` |

---

## Appendix B: Acceptance Criteria Summary

All of the following must pass before Spec 26 is considered complete. Test on **https://v4-show.vercel.app**.

### Navigation
- [ ] Completed adapter history entries are clickable and navigate to the detail page
- [ ] Non-completed entries are not clickable
- [ ] Breadcrumb "← Launch Tuning" returns to the correct page

### Detail Page Header
- [ ] Adapter name shown in `<h1>`
- [ ] Status badge shows "Active", "Superseded", or "Deleted" correctly
- [ ] Adapter ID shown in monospace
- [ ] HuggingFace link appears when `deployment_log.hf_path` is present
- [ ] Adapter ID derived from `deployment_log.adapter_name` when available, falling back to `adapter-{first8chars}`

### Deployment Report
- [ ] All 4 steps show correct success/failure icons
- [ ] File count and commit OID shown for HuggingFace step
- [ ] Endpoint ID and adapter count shown for RunPod step
- [ ] Workers Cycled shows "Pending" if `worker_refresh` is null
- [ ] HuggingFace link opens correct repo
- [ ] LORA_MODULES snapshot expands/collapses correctly
- [ ] Graceful empty state for historical adapters with no deployment log

### Adapter Status Ping
- [ ] No auto-polling — only fires on button click
- [ ] Spinner and "Checking..." shown during ping
- [ ] Three status rows shown after ping with correct icons
- [ ] 10-second cooldown enforced with toast error
- [ ] Adapter ID copy button works

### Endpoint Restart Tool
- [ ] Confirmation dialog appears (not `window.confirm`)
- [ ] Dialog contains cross-workbase downtime warning
- [ ] Toast "Restart initiated..." appears on confirm
- [ ] Five step rows show real-time progress with icons and timestamps
- [ ] Button disabled while restart is in progress
- [ ] Verdict card shows correct severity after completion
- [ ] 409 error if concurrent restart is attempted
- [ ] Auto-restart history shown for adapters deployed post-E02

### Training Configuration Card
- [ ] Sensitivity, Progression, Repetition, Cost all shown
- [ ] Training duration shown when `trainingTimeSeconds` available
- [ ] Null fields show `—` gracefully

### Lifecycle Actions
- [ ] "Remove from RunPod" button enabled only for active adapters
- [ ] Confirmation dialog appears (not `window.confirm`)
- [ ] Success toast shows API message
- [ ] Status badge updates to "Superseded" after removal
- [ ] Button disabled for superseded/deleted adapters
- [ ] 400 error handled when adapter not in LORA_MODULES
