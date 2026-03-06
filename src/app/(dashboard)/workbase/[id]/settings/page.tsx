'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkbase, useUpdateWorkbase } from '@/hooks/useWorkbases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function WorkbaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workbaseId = params.id as string;
  const { data: workbase, isLoading } = useWorkbase(workbaseId);
  const updateMutation = useUpdateWorkbase();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Initialize form when workbase loads
  if (workbase && !initialized) {
    setName(workbase.name);
    setDescription(workbase.description || '');
    setInitialized(true);
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({
        id: workbaseId,
        updates: { name: name.trim(), description: description.trim() || undefined },
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    }
  }

  async function handleArchive() {
    try {
      await updateMutation.mutateAsync({
        id: workbaseId,
        updates: { status: 'archived' },
      });
      toast.success('Work Base archived');
      router.push('/home');
    } catch (err) {
      toast.error('Failed to archive');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-duck-blue" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto bg-background min-h-full">
      <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

      {/* General */}
      <Card className="mb-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Endpoint info (read-only) */}
      {workbase?.activeAdapterJobId && (
        <Card className="mb-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Active Adapter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Adapter Job ID: <code className="text-foreground">{workbase.activeAdapterJobId}</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-red-200 bg-card">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Archive Work Base
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive this Work Base?</AlertDialogTitle>
                <AlertDialogDescription>
                  This Work Base will be hidden from your home list. Your documents,
                  conversations, and all data are preserved. You can restore it from
                  the home page at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleArchive}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Archiving…' : 'Archive'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
