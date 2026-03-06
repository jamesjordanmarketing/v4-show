'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateDocument, useUploadDocument } from '@/hooks/useRAGDocuments';

interface DocumentUploaderProps {
  workbaseId: string;
}

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
} as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function DocumentUploader({ workbaseId }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [fastMode, setFastMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDoc = useCreateDocument();
  const uploadDoc = useUploadDocument();

  const getFileType = (file: File): string => {
    const mimeType = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
    if (mimeType) return mimeType;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['pdf', 'docx', 'txt', 'md'].includes(ext)) return ext;
    return '';
  };

  const validateFile = (file: File): string | null => {
    const fileType = getFileType(file);
    if (!fileType) return `Unsupported file type. Accepted: PDF, DOCX, TXT, MD`;
    if (file.size > MAX_FILE_SIZE) return `File too large. Maximum: 50MB`;
    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      toast.error(error);
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) return;

    const fileType = getFileType(file);
    if (!fileType) {
      toast.error('Invalid file type');
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Create document record
      const doc = await createDoc.mutateAsync({
        workbaseId,
        fileName: file.name,
        fileType,
        description: description.trim() || undefined,
        fastMode,
      });

      // Step 2: Upload file and trigger processing
      await uploadDoc.mutateAsync({ documentId: doc.id, file });

      toast.success(`"${file.name}" uploaded and processing started`);
      setFile(null);
      setDescription('');
      setFastMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          {file ? (
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Drop a document here or click to browse</p>
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

      {/* Options */}
      {file && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="doc-description">Description (optional)</Label>
            <Textarea
              id="doc-description"
              placeholder="Brief description of this document's content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fast-mode">Fast Mode</Label>
              <p className="text-xs text-muted-foreground">Skip expert Q&A — go straight to ready</p>
            </div>
            <Switch
              id="fast-mode"
              checked={fastMode}
              onCheckedChange={setFastMode}
            />
          </div>

          <Button onClick={handleUpload} disabled={isUploading} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading & Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
