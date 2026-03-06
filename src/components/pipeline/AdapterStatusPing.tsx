'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { AdapterPingResult } from '@/types/adapter-detail';

interface AdapterStatusPingProps {
  jobId: string;
  adapterId: string;
  pingData: AdapterPingResult | undefined;
  isFetching: boolean;
  onRefresh: () => void;
}

function StatusRow({
  checked,
  label,
  detail,
}: {
  checked: boolean | null;
  label: string;
  detail?: string;
}) {
  const Icon = checked === null ? AlertTriangle : checked ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-2">
      <Icon
        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
          checked === null
            ? 'text-yellow-500'
            : checked
              ? 'text-green-600'
              : 'text-destructive'
        }`}
      />
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export function AdapterStatusPing({
  jobId: _jobId,
  adapterId,
  pingData,
  isFetching,
  onRefresh,
}: AdapterStatusPingProps) {
  const [lastCooldown, setLastCooldown] = useState(0);

  const handleRefresh = () => {
    const now = Date.now();
    if (now - lastCooldown < 10_000) {
      toast.error('Please wait 10 seconds between pings.');
      return;
    }
    setLastCooldown(now);
    onRefresh();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(adapterId);
    toast.success('Adapter ID copied');
  };

  // workerStatus.ready + idle > 0 returns boolean directly — no cast needed
  const workersOnline: boolean | null =
    pingData
      ? pingData.workerStatus.ready + pingData.workerStatus.idle > 0
      : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Adapter Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adapter ID with copy button */}
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1 text-foreground">
            {adapterId}
          </code>
          <Button variant="ghost" size="sm" onClick={handleCopyId} className="px-2">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {pingData ? (
          <div className="space-y-3">
            <StatusRow
              checked={pingData.registeredInLoraModules}
              label="Registered in LORA_MODULES"
              detail={
                pingData.registeredInLoraModules
                  ? `${pingData.loraModulesSnapshot.length} adapter(s) total on endpoint`
                  : 'Adapter not found in endpoint configuration'
              }
            />
            <StatusRow
              checked={workersOnline}
              label={
                workersOnline
                  ? `Workers online (${pingData.workerStatus.ready} ready, ${pingData.workerStatus.idle} idle)`
                  : 'Workers offline — endpoint is scaled to 0'
              }
            />
            <StatusRow
              checked={pingData.inferenceAvailable}
              label={
                pingData.inferenceAvailable
                  ? `Inference verified (latency: ${pingData.inferenceLatencyMs?.toLocaleString()}ms)`
                  : 'Inference unavailable'
              }
              detail={pingData.inferenceError || undefined}
            />

            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(pingData.checkedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click Refresh Status to check adapter health.
            <br />
            <span className="text-xs">Note: Each ping runs a live inference request (~$0.01–$0.02).</span>
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Checking...' : 'Refresh Status'}
        </Button>
      </CardContent>
    </Card>
  );
}
