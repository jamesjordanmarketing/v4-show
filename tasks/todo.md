# Spec 26 E04: Frontend Hook + Components

## Plan

Create the React Query hook and three pipeline components for the Adapter Detail Page.

## TODO

- [x] Read prerequisite files: usePipelineJobs.ts, useAdapterTesting.ts, DeployAdapterButton.tsx, EndpointStatusBanner.tsx
- [x] Create `src/hooks/useAdapterDetail.ts` — NO `'use client'` — exports 5 hooks
- [x] Create `src/components/pipeline/DeploymentTimeline.tsx`
- [x] Create `src/components/pipeline/AdapterStatusPing.tsx` — 10-second cooldown enforced
- [x] Create `src/components/pipeline/EndpointRestartTool.tsx` — single useEffect polling, confirmation dialog
- [x] TypeScript validation — zero errors
- [x] Design token audit — zero zinc-*/slate-*/gray-* in new files
