'use client';

import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { DeploymentLog } from '@/types/adapter-detail';

interface DeploymentTimelineProps {
  deploymentLog: DeploymentLog | null;
  isLoading: boolean;
}

function TimelineStep({
  success,
  label,
  detail,
}: {
  success: boolean | null;
  label: string;
  detail?: string;
}) {
  const Icon = success === null
    ? Clock
    : success
      ? CheckCircle2
      : XCircle;

  return (
    <div className="flex items-start gap-3">
      <Icon
        className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
          success === null
            ? 'text-muted-foreground'
            : success
              ? 'text-green-600'
              : 'text-destructive'
        }`}
      />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

export function DeploymentTimeline({ deploymentLog, isLoading }: DeploymentTimelineProps) {
  const [showLoraModules, setShowLoraModules] = useState(false);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading deployment report...
        </CardContent>
      </Card>
    );
  }

  if (!deploymentLog) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Deployment Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No deployment data available. This adapter may have been deployed before deployment logging was added.
          </p>
        </CardContent>
      </Card>
    );
  }

  const wr = deploymentLog.worker_refresh;
  const verificationResult = wr?.verification_result;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Deployment Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adapter ID */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Adapter ID:</span>
          <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">
            {deploymentLog.adapter_name}
          </code>
        </div>

        {/* 4-step timeline */}
        <div className="space-y-3">
          <TimelineStep
            success={true}
            label="HuggingFace Upload"
            detail={`${deploymentLog.hf_files_uploaded.length} files · ${deploymentLog.hf_path}${deploymentLog.hf_commit_oid ? ` · commit ${deploymentLog.hf_commit_oid.substring(0, 8)}` : ''}`}
          />

          <TimelineStep
            success={deploymentLog.runpod_save_success}
            label="RunPod LORA_MODULES Updated"
            detail={`Endpoint: ${deploymentLog.runpod_endpoint_id} · ${deploymentLog.runpod_lora_modules_after.length} total adapter(s) after update`}
          />

          <TimelineStep
            success={!!wr}
            label="Workers Cycled"
            detail={wr ? `Scale: 0 → ready` : 'Pending worker refresh...'}
          />

          <TimelineStep
            success={verificationResult === 'verified' ? true : verificationResult === 'unverified' ? false : null}
            label="Inference Verified"
            detail={
              verificationResult === 'verified'
                ? 'Adapter responded successfully to test inference'
                : verificationResult === 'unverified'
                  ? wr?.verification_error || 'Inference verification failed'
                  : verificationResult === 'skipped'
                    ? 'Verification was skipped'
                    : 'Pending...'
            }
          />
        </div>

        {/* HuggingFace link */}
        <a
          href={`https://huggingface.co/${deploymentLog.hf_path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-duck-blue hover:underline"
        >
          View on HuggingFace
          <ExternalLink className="h-3 w-3" />
        </a>

        {/* Expandable LORA_MODULES snapshot */}
        {deploymentLog.runpod_lora_modules_after.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground p-0 h-auto"
              onClick={() => setShowLoraModules(!showLoraModules)}
            >
              {showLoraModules
                ? <ChevronUp className="h-3 w-3 mr-1" />
                : <ChevronDown className="h-3 w-3 mr-1" />
              }
              LORA_MODULES snapshot ({deploymentLog.runpod_lora_modules_after.length})
            </Button>
            {showLoraModules && (
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto text-foreground">
                {JSON.stringify(deploymentLog.runpod_lora_modules_after, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
