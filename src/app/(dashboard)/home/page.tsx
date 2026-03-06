'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWorkbases, useCreateWorkbase, useWorkbasesArchived, useRestoreWorkbase } from '@/hooks/useWorkbases';
import { useCreateDocument, useUploadDocument } from '@/hooks/useRAGDocuments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, FolderOpen, MessageSquare, FileText, Upload, X, CheckCircle2 } from 'lucide-react';
import { Workbase } from '@/types/workbase';
import { toast } from 'sonner';

// ── QuickStart Wizard state machine ──────────────────────────────────────────

type QuickStartStep = 'name' | 'upload' | 'processing' | 'ready';

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
} as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getFileType(file: File): string {
  const mimeType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
  if (mimeType) return mimeType;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ['pdf', 'docx', 'txt', 'md'].includes(ext)) return ext;
  return '';
}

// ── Archived Workbase Card ─────────────────────────────────────────────────────

function ArchivedWorkbaseCard({ workbase }: { workbase: Workbase }) {
  const restoreMutation = useRestoreWorkbase();
  return (
    <Card className="bg-background border-border opacity-60">
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground truncate text-base">{workbase.name}</CardTitle>
        {workbase.description && (
          <p className="text-sm text-muted-foreground truncate">{workbase.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={restoreMutation.isPending}
          onClick={() => restoreMutation.mutate(workbase.id)}
        >
          {restoreMutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Restoring…</>
          ) : 'Restore Work Base'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { data: workbases, isLoading } = useWorkbases();
  const { data: archivedWorkbases } = useWorkbasesArchived();
  const createWorkbaseMutation = useCreateWorkbase();
  const createDocMutation = useCreateDocument();
  const uploadDocMutation = useUploadDocument();

  // Dialog state
  const [showWizard, setShowWizard] = useState(false);

  // Wizard state
  const [step, setStep] = useState<QuickStartStep>('name');
  const [workbaseName, setWorkbaseName] = useState('');
  const [workbaseDescription, setWorkbaseDescription] = useState('');
  const [createdWorkbaseId, setCreatedWorkbaseId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Wizard reset ─────────────────────────────────────────────────────────
  function openWizard() {
    setStep('name');
    setWorkbaseName('');
    setWorkbaseDescription('');
    setCreatedWorkbaseId(null);
    setSelectedFile(null);
    setDocumentId(null);
    setDocumentStatus(null);
    setIsUploading(false);
    setShowWizard(true);
  }

  // ── Step 1 → Step 2: Create workbase ─────────────────────────────────────
  async function handleCreateWorkbase() {
    if (!workbaseName.trim()) return;
    try {
      const wb = await createWorkbaseMutation.mutateAsync({
        name: workbaseName.trim(),
        description: workbaseDescription.trim() || undefined,
      });
      setCreatedWorkbaseId(wb.id);
      setStep('upload');
    } catch {
      toast.error('Failed to create Work Base');
    }
  }

  // ── Step 2 → Step 3: Upload document ──────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    if (!getFileType(file)) {
      toast.error('Unsupported file type. Accepted: PDF, DOCX, TXT, MD');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum: 50MB');
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  async function handleUploadDocument() {
    if (!selectedFile || !createdWorkbaseId) return;
    const fileType = getFileType(selectedFile);
    if (!fileType) return;

    setIsUploading(true);
    try {
      const doc = await createDocMutation.mutateAsync({
        workbaseId: createdWorkbaseId,
        fileName: selectedFile.name,
        fileType,
      });
      await uploadDocMutation.mutateAsync({ documentId: doc.id, file: selectedFile });
      setDocumentId(doc.id);
      setDocumentStatus('processing');
      setStep('processing');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  // ── Step 3: Poll document status until ready ──────────────────────────────
  useEffect(() => {
    if (step !== 'processing' || !documentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rag/documents/${documentId}`);
        const json = await res.json();
        const status: string = json.data?.document?.status;
        if (status) setDocumentStatus(status);
        if (status === 'ready' || status === 'awaiting_questions') {
          setStep('ready');
          clearInterval(interval);
        }
      } catch {
        // ignore transient poll errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [step, documentId]);

  // ── Step 4: Navigate to chat ───────────────────────────────────────────────
  function handleStartChatting() {
    if (!createdWorkbaseId) return;
    setShowWizard(false);
    router.push(`/workbase/${createdWorkbaseId}/fact-training/chat`);
  }

  function handleSelectWorkbase(wb: Workbase) {
    router.push(`/workbase/${wb.id}`);
  }

  // ── Wizard step indicators ─────────────────────────────────────────────────
  const steps: { key: QuickStartStep; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'upload', label: 'Upload' },
    { key: 'processing', label: 'Processing' },
    { key: 'ready', label: 'Chat' },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <img
                src="/bright-run-logo.png"
                alt="Bright Run"
                className="h-12 w-auto"
              />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* QuickStart tile (shown when 0 workbases) */}
        {!isLoading && (!workbases || workbases.length === 0) && (
          <Card className="mb-8 border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Chat with your documents in minutes
              </h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Create a Work Base to upload documents, generate training conversations,
                and chat with your AI.
              </p>
              <Button onClick={openWizard}>
                <Plus className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Work Base list */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Your Work Bases</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-duck-blue" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workbases?.map((wb) => (
              <Card
                key={wb.id}
                className="cursor-pointer hover:border-duck-blue transition-colors bg-card border-border"
                onClick={() => handleSelectWorkbase(wb)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-foreground truncate">{wb.name}</CardTitle>
                  {wb.description && (
                    <p className="text-sm text-muted-foreground truncate">{wb.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {wb.activeAdapterJobId ? 'Adapter Live' : 'No Adapter'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {wb.documentCount} docs
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Always-visible Create New Work Base card */}
            <Card
              className="cursor-pointer border-dashed border-border hover:border-duck-blue bg-background hover:bg-card transition-colors"
              onClick={openWizard}
            >
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plus className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Create New Work Base</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Archived Work Bases */}
        {archivedWorkbases && archivedWorkbases.length > 0 && (
          <div className="mt-10">
            <h2 className="text-base font-semibold text-muted-foreground mb-4">
              Archived Work Bases ({archivedWorkbases.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedWorkbases.map((wb) => (
                <ArchivedWorkbaseCard key={wb.id} workbase={wb} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── QuickStart Wizard Dialog ─────────────────────────────────────── */}
      <Dialog open={showWizard} onOpenChange={(open) => {
        if (!open && (step === 'name' || step === 'ready')) setShowWizard(false);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a Work Base</DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i < stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : i === stepIndex
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs ${i === stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Name ──────────────────────────────────────────────── */}
          {step === 'name' && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground">Work Base Name</label>
                <Input
                  value={workbaseName}
                  onChange={(e) => setWorkbaseName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkbase()}
                  placeholder="e.g., Claims Processing Manual"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description (optional)</label>
                <Input
                  value={workbaseDescription}
                  onChange={(e) => setWorkbaseDescription(e.target.value)}
                  placeholder="What is this Work Base for?"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowWizard(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateWorkbase}
                  disabled={!workbaseName.trim() || createWorkbaseMutation.isPending}
                >
                  {createWorkbaseMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                  ) : 'Next →'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload ────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Upload a document to teach your AI about your business.
              </p>

              <Card
                className={`border-2 border-dashed transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center justify-center py-8">
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="font-medium text-foreground">Drop a document here or click to browse</p>
                      <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, TXT, or MD — up to 50MB</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                  e.target.value = '';
                }}
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (createdWorkbaseId) router.push(`/workbase/${createdWorkbaseId}`);
                    setShowWizard(false);
                  }}
                >
                  Skip — upload later
                </button>
                <Button
                  onClick={handleUploadDocument}
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Upload & Process</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Processing ────────────────────────────────────────── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-foreground font-medium">Processing your document…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This usually takes 1–3 minutes. We'll let you know when it's ready.
                </p>
                {documentStatus && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Status: <span className="text-foreground">{documentStatus}</span>
                  </p>
                )}
              </div>
              <button
                className="text-sm text-muted-foreground hover:text-foreground mt-2"
                onClick={() => {
                  if (createdWorkbaseId) router.push(`/workbase/${createdWorkbaseId}`);
                  setShowWizard(false);
                }}
              >
                View Work Base in background →
              </button>
            </div>
          )}

          {/* ── Step 4: Ready ─────────────────────────────────────────────── */}
          {step === 'ready' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="text-foreground font-medium text-lg">Your document is ready!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start chatting with your AI — it now knows your document.
                </p>
              </div>
              <Button onClick={handleStartChatting} className="mt-2">
                Start Chatting →
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
