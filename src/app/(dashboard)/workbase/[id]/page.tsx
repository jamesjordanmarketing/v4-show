'use client';

import { useParams, useRouter } from 'next/navigation';
import { useWorkbase } from '@/hooks/useWorkbases';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Rocket,
  FileText,
  Upload,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

export default function WorkbaseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading } = useWorkbase(workbaseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-duck-blue" />
      </div>
    );
  }

  if (!workbase) {
    return (
      <div className="p-8 text-center text-muted-foreground">Work Base not found.</div>
    );
  }

  const hasAdapter = !!workbase.activeAdapterJobId;
  const hasDocs = (workbase.documentCount || 0) > 0;

  return (
    <div className="p-8 max-w-5xl mx-auto bg-background min-h-full">
      <h1 className="text-2xl font-bold text-foreground mb-2">{workbase.name}</h1>
      {workbase.description && (
        <p className="text-muted-foreground mb-8">{workbase.description}</p>
      )}

      {/* Empty state */}
      {!hasAdapter && !hasDocs && (
        <Card className="mb-8 border-dashed border-border bg-card">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Upload documents to start chatting, or create conversations to start training.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => router.push(`/workbase/${workbaseId}/fact-training/documents`)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Create Conversations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fine Tuning Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Rocket className="h-5 w-5 text-duck-blue" />
              Fine Tuning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Adapter Status</span>
                <Badge variant={hasAdapter ? 'default' : 'secondary'}>
                  {hasAdapter ? 'Live' : 'None'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Conversations → Launch Tuning
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/conversations`)}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fact Training Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-duck-blue" />
              Fact Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents</span>
                <span className="text-sm text-foreground">
                  {workbase.documentCount || 0} uploaded
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  router.push(
                    hasDocs
                      ? `/workbase/${workbaseId}/fact-training/chat`
                      : `/workbase/${workbaseId}/fact-training/documents`
                  )
                }
              >
                {hasDocs ? 'Open Chat' : 'Upload Documents'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Behavior Chat shortcut */}
      {(hasAdapter || hasDocs) && (
        <Card className="mt-6 bg-card border-border">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-duck-blue" />
              <div>
                <p className="font-medium text-foreground">Chat with your AI</p>
                <p className="text-sm text-muted-foreground">
                  {hasAdapter && hasDocs
                    ? 'Behavior + Documents available'
                    : hasAdapter
                    ? 'Behavior mode available'
                    : 'Documents mode available'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/workbase/${workbaseId}/fine-tuning/chat`)}
            >
              Open Chat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
