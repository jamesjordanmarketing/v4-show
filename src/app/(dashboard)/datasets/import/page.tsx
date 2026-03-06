'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAvailableTrainingFiles, useImportTrainingFile, useBulkImportTrainingFiles } from '@/hooks/useTrainingFileImport';
import { Loader2, Download, CheckCircle, ArrowLeft, Package } from 'lucide-react';

/**
 * Import Training Files Page
 * From Section DATA-BRIDGE - Training Files to Datasets Migration
 * Route: /datasets/import
 */
export default function ImportTrainingFilesPage() {
  const router = useRouter();
  const { data, isLoading } = useAvailableTrainingFiles();
  const importFile = useImportTrainingFile();
  const bulkImport = useBulkImportTrainingFiles();
  const [importing, setImporting] = useState<Set<string>>(new Set());

  const handleImport = async (fileId: string) => {
    setImporting(prev => new Set(prev).add(fileId));
    try {
      await importFile.mutateAsync(fileId);
    } finally {
      setImporting(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const handleBulkImport = async () => {
    if (!data?.data.available_for_import) return;
    const ids = data.data.available_for_import.map((f: any) => f.id);
    await bulkImport.mutateAsync(ids);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const summary = data?.data.summary;
  const availableFiles = data?.data.available_for_import || [];
  const allFiles = data?.data.all_training_files || [];

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push('/datasets')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Training Files</h1>
          <p className="text-gray-600 mt-1">
            Import your existing training files as datasets for the LoRA pipeline
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
          <CardDescription>
            Overview of your training files and import status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Training Files</div>
              <div className="text-2xl font-bold">{summary?.total_training_files || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Already Imported</div>
              <div className="text-2xl font-bold text-green-600">{summary?.already_imported || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Available to Import</div>
              <div className="text-2xl font-bold text-blue-600">{summary?.available_for_import || 0}</div>
            </div>
          </div>

          {availableFiles.length > 0 && (
            <div className="mt-6">
              <Button
                onClick={handleBulkImport}
                disabled={bulkImport.isPending}
                className="w-full"
              >
                {bulkImport.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Import All {availableFiles.length} Training Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Files Available */}
      {allFiles.length === 0 && (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            No training files found. Create training files from your conversations first.
          </AlertDescription>
        </Alert>
      )}

      {/* All Files Already Imported */}
      {allFiles.length > 0 && availableFiles.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            All your training files have been imported as datasets. You can now configure training jobs!
          </AlertDescription>
        </Alert>
      )}

      {/* Training Files List */}
      {allFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Training Files</CardTitle>
            <CardDescription>
              {availableFiles.length > 0 
                ? `${availableFiles.length} file(s) available for import` 
                : 'All files imported'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allFiles.map((file: any) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{file.name}</h3>
                      {file.is_imported ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Imported
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Available
                        </Badge>
                      )}
                    </div>
                    {file.description && (
                      <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>{file.conversation_count} conversations</span>
                      <span>{file.total_training_pairs} training pairs</span>
                      <span>{(file.jsonl_file_size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {!file.is_imported && (
                    <Button
                      onClick={() => handleImport(file.id)}
                      disabled={importing.has(file.id)}
                      size="sm"
                    >
                      {importing.has(file.id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Import
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 sticky bottom-0 bg-white py-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => router.push('/datasets')}
          className="flex-1"
        >
          Back to Datasets
        </Button>
        <Button 
          onClick={() => router.push('/training/configure')}
          disabled={summary?.already_imported === 0}
          className="flex-1"
        >
          Configure Training Job
        </Button>
      </div>
    </div>
  );
}


