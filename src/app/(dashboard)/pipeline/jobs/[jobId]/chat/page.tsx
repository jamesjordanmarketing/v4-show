/**
 * Multi-Turn Chat Page
 * 
 * Route: /pipeline/jobs/[jobId]/chat
 * 
 * Full A/B testing chat interface for extended multi-turn conversations.
 * Compares Control vs Adapted model responses with optional per-turn evaluation.
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MultiTurnChat } from '@/components/pipeline/chat';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: { jobId: string };
  searchParams: { conversationId?: string };
}

export default async function MultiTurnChatPage({ params, searchParams }: PageProps) {
  const supabase = await createServerSupabaseClient();
  
  // Verify job exists
  const { data: job, error } = await supabase
    .from('pipeline_training_jobs')
    .select('id, job_name, status')
    .eq('id', params.jobId)
    .single();
  
  if (error || !job) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Multi-Turn Chat Testing</h1>
        <p className="text-muted-foreground">
          Test extended conversations with {job.job_name}
        </p>
      </div>
      
      <Suspense fallback={<ChatPageSkeleton />}>
        <MultiTurnChat 
          jobId={params.jobId} 
          initialConversationId={searchParams.conversationId}
        />
      </Suspense>
    </div>
  );
}

function ChatPageSkeleton() {
  return (
    <div className="flex h-[600px] gap-4">
      <Skeleton className="w-64 h-full" />
      <Skeleton className="flex-1 h-full" />
    </div>
  );
}
