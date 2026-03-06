# LoRA Pipeline - Manual Deployment Actions

**Complete these tasks in order.**

---

## Task 1: Set Edge Function Secrets

### Option A: Using Supabase Dashboard

1. Open browser
2. Navigate to: `https://supabase.com/dashboard`
3. Click on project: **hqhtbxlgzysfbekexwku**
4. Click **Edge Functions** in left sidebar
5. Click **Manage secrets** button (top right)
6. Click **Add new secret** button

**Add Secret 1:**
7. In "Name" field, type: `GPU_CLUSTER_API_KEY`
8. In "Value" field, paste: `YOUR_RUNPOD_API_KEY`
9. Click **Add secret** button

**Add Secret 2:**
10. Click **Add new secret** button
11. In "Name" field, type: `GPU_CLUSTER_ENDPOINT`
12. In "Value" field, paste: `https://api.runpod.ai/v2/ei82ickpenoqlp`
13. Click **Add secret** button

14. Close the secrets panel

### Option B: Using CLI (Alternative)

1. Open terminal in: `C:\Users\james\Master\BrightHub\BRun\v4-show`
2. Run: `npx supabase secrets set GPU_CLUSTER_API_KEY=YOUR_RUNPOD_API_KEY`
3. Press Enter
4. Run: `npx supabase secrets set GPU_CLUSTER_ENDPOINT=https://api.runpod.ai/v2/ei82ickpenoqlp`
5. Press Enter

**Verify:**
6. Run: `npx supabase secrets list`
7. Confirm both secrets appear in list

---

## Task 2: Configure Storage RLS Policies

### Part A: lora-datasets Bucket

1. Open browser
2. Navigate to: `https://supabase.com/dashboard`
3. Click on project: **hqhtbxlgzysfbekexwku**
4. Click **Storage** in left sidebar
5. Click **Policies** tab
6. Find "lora-datasets" section
7. Click **New policy** button

**Policy 1: Upload**
8. Click **Create a policy from scratch**
9. In "Policy name" field, type: `Users can upload own datasets`
10. In "Policy command" dropdown, select: **INSERT**
11. In "WITH CHECK expression" field, paste:
```
bucket_id = 'lora-datasets' AND (storage.foldername(name))[1] = auth.uid()::text
```
12. Click **Save** button

**Policy 2: Read**
13. Click **New policy** button
14. Click **Create a policy from scratch**
15. In "Policy name" field, type: `Users can read own datasets`
16. In "Policy command" dropdown, select: **SELECT**
17. In "USING expression" field, paste:
```
bucket_id = 'lora-datasets' AND (storage.foldername(name))[1] = auth.uid()::text
```
18. Click **Save** button

**Policy 3: Delete**
19. Click **New policy** button
20. Click **Create a policy from scratch**
21. In "Policy name" field, type: `Users can delete own datasets`
22. In "Policy command" dropdown, select: **DELETE**
23. In "USING expression" field, paste:
```
bucket_id = 'lora-datasets' AND (storage.foldername(name))[1] = auth.uid()::text
```
24. Click **Save** button

### Part B: lora-models Bucket

25. Scroll to "lora-models" section
26. Click **New policy** button

**Policy 1: Read**
27. Click **Create a policy from scratch**
28. In "Policy name" field, type: `Users can read own models`
29. In "Policy command" dropdown, select: **SELECT**
30. In "USING expression" field, paste:
```
bucket_id = 'lora-models' AND (storage.foldername(name))[1] = auth.uid()::text
```
31. Click **Save** button

**Policy 2: Service Write**
32. Click **New policy** button
33. Click **Create a policy from scratch**
34. In "Policy name" field, type: `Service can write model files`
35. In "Policy command" dropdown, select: **INSERT**
36. In "WITH CHECK expression" field, paste:
```
bucket_id = 'lora-models' AND auth.role() = 'service_role'
```
37. Click **Save** button

---

## Task 3: Add Vercel Environment Variables

### Get Required Values First

**Step 1: Get Supabase Keys**
1. Open: `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`
2. Copy value of `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Copy value of `SUPABASE_SERVICE_ROLE_KEY`
4. Keep file open for reference

**Step 2: Add to Vercel**
5. Open browser
6. Navigate to: `https://vercel.com`
7. Click **Dashboard**
8. Click your project name
9. Click **Settings** tab
10. Click **Environment Variables** in left sidebar

**Variable 1:**
11. Click **Add New** button
12. In "Key" field, type: `NEXT_PUBLIC_SUPABASE_URL`
13. In "Value" field, paste: `https://hqhtbxlgzysfbekexwku.supabase.co`
14. Check: **Production**
15. Check: **Preview**
16. Check: **Development**
17. Click **Save** button

**Variable 2:**
18. Click **Add New** button
19. In "Key" field, type: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
20. In "Value" field, paste the anon key from `.env.local`
21. Check: **Production**
22. Check: **Preview**
23. Check: **Development**
24. Click **Save** button

**Variable 3:**
25. Click **Add New** button
26. In "Key" field, type: `SUPABASE_SERVICE_ROLE_KEY`
27. In "Value" field, paste the service role key from `.env.local`
28. Check: **Production**
29. Check: **Preview**
30. Check: **Development**
31. Click **Save** button

**Variable 4:**
32. Click **Add New** button
33. In "Key" field, type: `GPU_CLUSTER_API_URL`
34. In "Value" field, paste: `https://api.runpod.ai/v2/ei82ickpenoqlp`
35. Check: **Production** only
36. Click **Save** button

**Variable 5:**
37. Click **Add New** button
38. In "Key" field, type: `GPU_CLUSTER_API_KEY`
39. In "Value" field, paste: `YOUR_RUNPOD_API_KEY`
40. Check: **Production** only
41. Click **Save** button

**Variable 6 (Optional):**
42. Click **Add New** button
43. In "Key" field, type: `MAX_DATASET_SIZE_MB`
44. In "Value" field, type: `500`
45. Check: **Production** only
46. Click **Save** button

**Variable 7 (Optional):**
47. Click **Add New** button
48. In "Key" field, type: `MAX_TRAINING_DURATION_HOURS`
49. In "Value" field, type: `48`
50. Check: **Production** only
51. Click **Save** button

---

## Task 4: Set Up Cron Jobs

### Using cron-job.org

**Step 1: Create Account**
1. Open browser
2. Navigate to: `https://cron-job.org`
3. Click **Sign up** button
4. Enter email address
5. Enter password
6. Click **Sign up** button
7. Check email for verification
8. Click verification link
9. Log in to cron-job.org

**Step 2: Get Service Role Key**
10. Open: `C:\Users\james\Master\BrightHub\BRun\v4-show\.env.local`
11. Copy value of `SUPABASE_SERVICE_ROLE_KEY`
12. Keep for next steps

**Step 3: Create Cron Job 1 - validate-datasets**
13. Click **Cronjobs** in top menu
14. Click **Create cronjob** button
15. In "Title" field, type: `LoRA: Validate Datasets`
16. In "Address" field, paste: `https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1/validate-datasets`
17. In "Schedule" section, select: **Every minute**
18. In "Request method" dropdown, select: **POST**
19. Click **Request headers** accordion
20. Click **Add request header** button
21. In "Name" field, type: `Authorization`
22. In "Value" field, type: `Bearer ` then paste the service role key
23. Click **Add request header** button again
24. In "Name" field, type: `Content-Type`
25. In "Value" field, type: `application/json`
26. Click **Create** button

**Step 4: Create Cron Job 2 - process-training-jobs**
27. Click **Create cronjob** button
28. In "Title" field, type: `LoRA: Process Training Jobs`
29. In "Address" field, paste: `https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1/process-training-jobs`
30. In "Schedule" section, select: **Every 30 seconds** (if available, otherwise use **Every minute**)
31. In "Request method" dropdown, select: **POST**
32. Click **Request headers** accordion
33. Click **Add request header** button
34. In "Name" field, type: `Authorization`
35. In "Value" field, type: `Bearer ` then paste the service role key
36. Click **Add request header** button again
37. In "Name" field, type: `Content-Type`
38. In "Value" field, type: `application/json`
39. Click **Create** button

**Step 5: Create Cron Job 3 - create-model-artifacts**
40. Click **Create cronjob** button
41. In "Title" field, type: `LoRA: Create Model Artifacts`
42. In "Address" field, paste: `https://hqhtbxlgzysfbekexwku.supabase.co/functions/v1/create-model-artifacts`
43. In "Schedule" section, select: **Every minute**
44. In "Request method" dropdown, select: **POST**
45. Click **Request headers** accordion
46. Click **Add request header** button
47. In "Name" field, type: `Authorization`
48. In "Value" field, type: `Bearer ` then paste the service role key
49. Click **Add request header** button again
50. In "Name" field, type: `Content-Type`
51. In "Value" field, type: `application/json`
52. Click **Create** button

**Step 6: Verify**
53. Check that all 3 cron jobs appear in list
54. Verify they show as "Enabled"
55. Wait 1-2 minutes
56. Click on each job to see execution history
57. Verify successful executions (green checkmarks or HTTP 200/202 responses)

---

## Verification Commands

**After completing all tasks, run these commands:**

### Terminal 1:
```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show
npx tsx scripts/verify-lora-integration.ts
```

### Terminal 2:
```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show
npx tsx scripts/check-lora-health.ts
```

### Terminal 3:
```bash
cd C:\Users\james\Master\BrightHub\BRun\v4-show
node scripts/test-edge-functions.js
```

---

**All tasks complete. Ready for frontend deployment.**
